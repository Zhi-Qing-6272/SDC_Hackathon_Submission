import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db, learnerProfiles, learningTeams, learningTeamMembers, teamInvitations } from "@workspace/db";
import { accountOf } from "../lib/identity";
import { mailConfigured, sendInvitationEmail } from "../lib/mailer";

// Learning teams. A person creates a team first, then invites others BY EMAIL. Someone becomes a member only when
// they accept (signed in with a verified address that matches the invitation). Rules enforced here, not in the browser:
//  - only the owner can invite, edit or remove people; ownership always comes from the session;
//  - an invitation can only be accepted by an account that owns the invited, verified email address;
//  - the owner only ever receives a member's name, current role, skills and chosen direction (never interests, notes or CV).
const router: IRouter = Router();
const uid = (req: Request) => getAuth(req).userId!;
const INVITE_DAYS = 7, MAX_OWNED = 10, MAX_PENDING = 25, MAX_MEMBERS = 50;
const Id = z.string().uuid();
const NAME = z.string().trim().min(2).max(80);
const ROLE = z.string().regex(/^[a-z0-9-]{2,24}$/);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const mask = (e: string) => { const [a, d] = e.split("@"); return `${a.slice(0, 1)}${"*".repeat(Math.max(1, Math.min(4, a.length - 1)))}@${d}`; };

router.use(["/teams", "/invitations"], (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!getAuth(req).userId) { res.status(401).json({ error: "Sign in to use teams" }); return; }
  next();
});

// Limit invitation emails: 20 per user per hour (per server instance) so the feature cannot be used to spam people.
const sends = new Map<string, { n: number; reset: number }>();
const overLimit = (u: string) => { const a = sends.get(u); return !!a && a.reset > Date.now() && a.n >= 20; };
const countSend = (u: string) => { const a = sends.get(u); sends.set(u, a && a.reset > Date.now() ? { ...a, n: a.n + 1 } : { n: 1, reset: Date.now() + 3_600_000 }); };

function baseUrl(req: Request) {
  const configured = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  // The app already rejects cross-origin writes, so the Origin (when present) is this site's own address.
  const origin = req.headers.origin;
  const host = req.get("x-forwarded-host") ?? req.get("host");
  return (origin ?? `${req.get("x-forwarded-proto") ?? req.protocol}://${host}`).replace(/\/$/, "") + (process.env.APP_BASE_PATH ?? "").replace(/\/$/, "");
}
const status = (i: { status: string; expiresAt: Date }) => (i.status === "pending" && i.expiresAt.getTime() < Date.now() ? "expired" : i.status);

async function ownedTeam(req: Request, id: string) {
  const [t] = await db.select().from(learningTeams).where(and(eq(learningTeams.id, id), eq(learningTeams.ownerUserId, uid(req))));
  return t;
}

router.get("/teams", async (req, res) => {
  const me = uid(req);
  const account = await accountOf(me);
  const owned = await db.select().from(learningTeams).where(eq(learningTeams.ownerUserId, me)).orderBy(learningTeams.createdAt);
  const mine = await db.select().from(learningTeamMembers).where(eq(learningTeamMembers.userId, me));
  const joinedIds = mine.map(m => m.teamId).filter(id => !owned.some(t => t.id === id));
  const joinedTeams = joinedIds.length ? await db.select().from(learningTeams).where(inArray(learningTeams.id, joinedIds)) : [];
  const teamIds = [...owned.map(t => t.id), ...joinedIds];
  const members = teamIds.length ? await db.select().from(learningTeamMembers).where(inArray(learningTeamMembers.teamId, teamIds)) : [];
  const invites = owned.length ? await db.select().from(teamInvitations).where(inArray(teamInvitations.teamId, owned.map(t => t.id))).orderBy(teamInvitations.createdAt) : [];
  const ownerIds = joinedTeams.map(t => t.ownerUserId);
  const ids = [...new Set([...members.filter(m => owned.some(t => t.id === m.teamId)).map(m => m.userId), ...ownerIds])];
  const profiles = ids.length ? await db.select().from(learnerProfiles).where(inArray(learnerProfiles.userId, ids)) : [];
  const mine_ = account.emails.length ? await db.select().from(teamInvitations).where(and(inArray(teamInvitations.email, account.emails), eq(teamInvitations.status, "pending"))) : [];
  const live = mine_.filter(i => i.expiresAt.getTime() > Date.now());
  const inviteTeams = live.length ? await db.select().from(learningTeams).where(inArray(learningTeams.id, live.map(i => i.teamId))) : [];
  res.json({
    emailConfigured: mailConfigured(),
    myEmail: account.emails[0] ?? "",
    owned: owned.map(t => ({
      id: t.id, name: t.name, targetRoleId: t.targetRoleId,
      members: members.filter(m => m.teamId === t.id).map(m => {
        const p = profiles.find(x => x.userId === m.userId);
        return { id: m.id, name: p?.name ?? m.displayName, currentRole: p?.currentRole ?? "", skills: p?.skills ?? [], goalRoleId: p?.goalRoleId ?? null, hasProfile: !!p, isOwner: m.userId === t.ownerUserId, joinedAt: m.joinedAt };
      }).sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name)),
      invitations: invites.filter(i => i.teamId === t.id && ["pending", "declined"].includes(i.status))
        .map(i => ({ id: i.id, email: i.email, status: status(i), createdAt: i.createdAt, expiresAt: i.expiresAt })),
    })),
    joined: joinedTeams.map(t => ({
      id: t.id, name: t.name, targetRoleId: t.targetRoleId, memberCount: members.filter(m => m.teamId === t.id).length,
      ownerName: profiles.find(p => p.userId === t.ownerUserId)?.name ?? members.find(m => m.teamId === t.id && m.userId === t.ownerUserId)?.displayName ?? "The team owner",
      joinedAt: mine.find(m => m.teamId === t.id)?.joinedAt,
    })),
    invitations: live.map(i => ({ id: i.id, teamName: inviteTeams.find(t => t.id === i.teamId)?.name ?? "A team", inviterName: i.inviterName, email: i.email, expiresAt: i.expiresAt })),
  });
});

router.post("/teams", async (req, res) => {
  const parsed = z.object({ name: NAME, targetRoleId: ROLE.nullable().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Give the team a name of 2–80 characters" }); return; }
  const me = uid(req);
  const owned = await db.select({ id: learningTeams.id }).from(learningTeams).where(eq(learningTeams.ownerUserId, me));
  if (owned.length >= MAX_OWNED) { res.status(409).json({ error: `You can own up to ${MAX_OWNED} teams` }); return; }
  const account = await accountOf(me);
  const [profile] = await db.select({ name: learnerProfiles.name }).from(learnerProfiles).where(eq(learnerProfiles.userId, me));
  const team = await db.transaction(async tx => {
    const [t] = await tx.insert(learningTeams).values({ ownerUserId: me, name: parsed.data.name, targetRoleId: parsed.data.targetRoleId ?? null }).returning();
    await tx.insert(learningTeamMembers).values({ teamId: t.id, userId: me, displayName: profile?.name ?? account.name });
    return t;
  });
  res.status(201).json({ id: team.id, name: team.name });
});

router.put("/teams/:id", async (req, res) => {
  const id = Id.safeParse(req.params.id);
  const parsed = z.object({ name: NAME.optional(), targetRoleId: ROLE.nullable().optional() }).safeParse(req.body);
  if (!id.success || !parsed.success) { res.status(400).json({ error: "Check the team details" }); return; }
  if (!await ownedTeam(req, id.data)) { res.status(404).json({ error: "Team not found" }); return; }
  const set: Partial<typeof learningTeams.$inferInsert> = {};
  if (parsed.data.name !== undefined) set.name = parsed.data.name;
  if (parsed.data.targetRoleId !== undefined) set.targetRoleId = parsed.data.targetRoleId;
  if (Object.keys(set).length) await db.update(learningTeams).set(set).where(eq(learningTeams.id, id.data));
  res.json({ ok: true });
});

router.delete("/teams/:id", async (req, res) => {
  const id = Id.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid team" }); return; }
  if (!await ownedTeam(req, id.data)) { res.status(404).json({ error: "Team not found" }); return; }
  await db.transaction(async tx => {
    await tx.delete(teamInvitations).where(eq(teamInvitations.teamId, id.data));
    await tx.delete(learningTeamMembers).where(eq(learningTeamMembers.teamId, id.data));
    await tx.delete(learningTeams).where(eq(learningTeams.id, id.data));
  });
  res.status(204).end();
});

async function deliver(req: Request, team: { id: string; name: string }, inv: { id: string; email: string; inviterName: string }, token: string) {
  const link = `${baseUrl(req)}/invite/${token}`;
  const r = await sendInvitationEmail({ to: inv.email, teamName: team.name, inviterName: inv.inviterName, link, expiresDays: INVITE_DAYS });
  return { emailSent: r.sent, ...(r.sent ? {} : { link, emailError: r.error }) };
}
const newToken = () => randomBytes(24).toString("base64url");
const expiry = () => new Date(Date.now() + INVITE_DAYS * 86_400_000);

router.post("/teams/:id/invitations", async (req, res) => {
  const id = Id.safeParse(req.params.id);
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(200) }).safeParse(req.body);
  if (!id.success) { res.status(400).json({ error: "Invalid team" }); return; }
  if (!parsed.success) { res.status(400).json({ error: "Enter a valid email address", field: "email" }); return; }
  const team = await ownedTeam(req, id.data);
  if (!team) { res.status(404).json({ error: "Team not found. Create a team first." }); return; }
  const me = uid(req), email = parsed.data.email;
  const account = await accountOf(me);
  if (account.emails.includes(email)) { res.status(400).json({ error: "That is your own email address. You are already in this team.", field: "email" }); return; }
  if (overLimit(me)) { res.status(429).json({ error: "You have sent a lot of invitations. Try again in an hour." }); return; }
  const [members, invs] = await Promise.all([
    db.select({ id: learningTeamMembers.id }).from(learningTeamMembers).where(eq(learningTeamMembers.teamId, team.id)),
    db.select().from(teamInvitations).where(eq(teamInvitations.teamId, team.id)),
  ]);
  if (members.length >= MAX_MEMBERS) { res.status(409).json({ error: `A team can have up to ${MAX_MEMBERS} members` }); return; }
  const same = invs.filter(i => i.email === email);
  if (same.some(i => i.status === "accepted")) { res.status(409).json({ error: "This person is already in the team.", field: "email" }); return; }
  if (same.some(i => status(i) === "pending")) { res.status(409).json({ error: "This person already has a pending invitation. Use Resend if they did not get it.", field: "email" }); return; }
  if (invs.filter(i => status(i) === "pending").length >= MAX_PENDING) { res.status(409).json({ error: `Up to ${MAX_PENDING} invitations can be waiting at once` }); return; }
  const token = newToken();
  // A declined, revoked, expired or left invitation is replaced by a fresh one for the same address.
  const [inv] = await db.transaction(async tx => {
    if (same.length) await tx.delete(teamInvitations).where(and(eq(teamInvitations.teamId, team.id), eq(teamInvitations.email, email)));
    return tx.insert(teamInvitations).values({ teamId: team.id, email, tokenHash: hash(token), invitedByUserId: me, inviterName: account.name, expiresAt: expiry() }).returning();
  });
  countSend(me);
  const delivery = await deliver(req, team, inv, token);
  res.status(201).json({ id: inv.id, email: inv.email, status: "pending", ...delivery });
});

router.post("/teams/:id/invitations/:invId/resend", async (req, res) => {
  const id = Id.safeParse(req.params.id), invId = Id.safeParse(req.params.invId);
  if (!id.success || !invId.success) { res.status(400).json({ error: "Invalid invitation" }); return; }
  const team = await ownedTeam(req, id.data);
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  const [inv] = await db.select().from(teamInvitations).where(and(eq(teamInvitations.id, invId.data), eq(teamInvitations.teamId, team.id)));
  if (!inv || !["pending", "declined"].includes(inv.status)) { res.status(404).json({ error: "Invitation not found" }); return; }
  if (overLimit(uid(req))) { res.status(429).json({ error: "You have sent a lot of invitations. Try again in an hour." }); return; }
  const token = newToken();
  await db.update(teamInvitations).set({ tokenHash: hash(token), status: "pending", expiresAt: expiry(), respondedAt: null }).where(eq(teamInvitations.id, inv.id));
  countSend(uid(req));
  res.json({ id: inv.id, email: inv.email, status: "pending", ...await deliver(req, team, inv, token) });
});

router.delete("/teams/:id/invitations/:invId", async (req, res) => {
  const id = Id.safeParse(req.params.id), invId = Id.safeParse(req.params.invId);
  if (!id.success || !invId.success) { res.status(400).json({ error: "Invalid invitation" }); return; }
  if (!await ownedTeam(req, id.data)) { res.status(404).json({ error: "Team not found" }); return; }
  await db.update(teamInvitations).set({ status: "revoked", respondedAt: new Date() }).where(and(eq(teamInvitations.id, invId.data), eq(teamInvitations.teamId, id.data), inArray(teamInvitations.status, ["pending", "declined"])));
  res.status(204).end();
});

async function dropMember(teamId: string, userId: string, why: "left") {
  await db.transaction(async tx => {
    await tx.delete(learningTeamMembers).where(and(eq(learningTeamMembers.teamId, teamId), eq(learningTeamMembers.userId, userId)));
    await tx.update(teamInvitations).set({ status: why }).where(and(eq(teamInvitations.teamId, teamId), eq(teamInvitations.acceptedByUserId, userId)));
  });
}
router.delete("/teams/:id/members/:memberId", async (req, res) => {
  const id = Id.safeParse(req.params.id), mid = Id.safeParse(req.params.memberId);
  if (!id.success || !mid.success) { res.status(400).json({ error: "Invalid member" }); return; }
  const team = await ownedTeam(req, id.data);
  if (!team) { res.status(404).json({ error: "Team not found" }); return; }
  const [m] = await db.select().from(learningTeamMembers).where(and(eq(learningTeamMembers.id, mid.data), eq(learningTeamMembers.teamId, team.id)));
  if (!m) { res.status(404).json({ error: "Member not found" }); return; }
  if (m.userId === team.ownerUserId) { res.status(409).json({ error: "You own this team. Delete the team instead." }); return; }
  await dropMember(team.id, m.userId, "left");
  res.status(204).end();
});

router.delete("/teams/:id/membership", async (req, res) => {
  const id = Id.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid team" }); return; }
  const [t] = await db.select().from(learningTeams).where(eq(learningTeams.id, id.data));
  if (t?.ownerUserId === uid(req)) { res.status(409).json({ error: "You own this team. Delete the team instead." }); return; }
  await dropMember(id.data, uid(req), "left");
  res.status(204).end();
});

// ---- invitations, from the invited person's side
async function myInvitation(req: Request, where: ReturnType<typeof and> | ReturnType<typeof eq>) {
  const [inv] = await db.select().from(teamInvitations).where(where);
  if (!inv) return { inv: null as null };
  const [team] = await db.select().from(learningTeams).where(eq(learningTeams.id, inv.teamId));
  const account = await accountOf(uid(req));
  return { inv, team, account, forMe: account.emails.includes(inv.email) };
}

router.get("/invitations/token/:token", async (req, res) => {
  const token = z.string().min(20).max(80).safeParse(req.params.token);
  if (!token.success) { res.status(404).json({ error: "This invitation link is not valid." }); return; }
  const r = await myInvitation(req, eq(teamInvitations.tokenHash, hash(token.data)));
  if (!r.inv || !r.team) { res.status(404).json({ error: "This invitation link is not valid or has been replaced." }); return; }
  res.json({ id: r.inv.id, teamName: r.team.name, inviterName: r.inv.inviterName, email: mask(r.inv.email), status: status(r.inv), forYou: r.forMe, yourEmail: r.account!.emails[0] ?? "" });
});

const answer = (action: "accept" | "decline") => async (req: Request, res: Response) => {
  const id = Id.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid invitation" }); return; }
  const r = await myInvitation(req, eq(teamInvitations.id, id.data));
  // Unknown and not-yours look the same, so nobody can probe for other people's invitations.
  if (!r.inv || !r.team || !r.forMe) { res.status(r.inv ? 403 : 404).json({ error: r.inv ? `This invitation was sent to ${mask(r.inv.email)}. Sign in with that email address to answer it.` : "Invitation not found" }); return; }
  const st = status(r.inv);
  if (st === "expired") { res.status(410).json({ error: "This invitation has expired. Ask the team owner to send a new one." }); return; }
  if (st === "accepted") { res.json({ status: "accepted", teamName: r.team.name }); return; }
  if (st !== "pending") { res.status(410).json({ error: "This invitation is no longer available." }); return; }
  const me = uid(req);
  if (action === "decline") {
    await db.update(teamInvitations).set({ status: "declined", respondedAt: new Date() }).where(eq(teamInvitations.id, r.inv.id));
    res.json({ status: "declined" }); return;
  }
  const [profile] = await db.select({ name: learnerProfiles.name }).from(learnerProfiles).where(eq(learnerProfiles.userId, me));
  const count = await db.select({ id: learningTeamMembers.id }).from(learningTeamMembers).where(eq(learningTeamMembers.teamId, r.team.id));
  if (count.length >= MAX_MEMBERS) { res.status(409).json({ error: "This team is full." }); return; }
  await db.transaction(async tx => {
    await tx.insert(learningTeamMembers).values({ teamId: r.team!.id, userId: me, displayName: profile?.name ?? r.account!.name }).onConflictDoNothing();
    await tx.update(teamInvitations).set({ status: "accepted", respondedAt: new Date(), acceptedByUserId: me }).where(eq(teamInvitations.id, r.inv!.id));
  });
  res.json({ status: "accepted", teamName: r.team.name });
};
router.post("/invitations/:id/accept", answer("accept"));
router.post("/invitations/:id/decline", answer("decline"));

// Used by "Erase workspace data": owned teams disappear, the user leaves other teams.
export async function removeUserFromTeams(tx: Pick<typeof db, "select" | "delete" | "update">, userId: string) {
  const owned = await tx.select({ id: learningTeams.id }).from(learningTeams).where(eq(learningTeams.ownerUserId, userId));
  const ids = owned.map(t => t.id);
  if (ids.length) {
    await tx.delete(teamInvitations).where(inArray(teamInvitations.teamId, ids));
    await tx.delete(learningTeamMembers).where(inArray(learningTeamMembers.teamId, ids));
    await tx.delete(learningTeams).where(inArray(learningTeams.id, ids));
  }
  await tx.update(teamInvitations).set({ status: "left" }).where(and(eq(teamInvitations.acceptedByUserId, userId), ne(teamInvitations.status, "revoked")));
  await tx.delete(learningTeamMembers).where(eq(learningTeamMembers.userId, userId));
}

export default router;
