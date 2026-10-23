import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, like, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { buildSyntheticData, SYNTHETIC_PREFIX } from "../lib/synthetic-data";
import { db, learnerProfiles, learningProgress, organizations, orgMembers, orgTeams, orgRecommendations } from "@workspace/db";

// Company workspace: an administrator sees skill gaps for employees who have chosen to share, and recommends
// training for teams. Rules enforced here, never in the browser:
//  - the organisation and role always come from the signed-in user's membership row, not from the request;
//  - an employee appears to the administrator only while shareWithAdmin is true;
//  - the administrator only ever receives skills, current role, chosen direction and progress counts.
const router: IRouter = Router();
const uid = (req: Request) => getAuth(req).userId!;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

router.use("/org", (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!getAuth(req).userId) { res.status(401).json({ error: "Sign in to use the company workspace" }); return; }
  next();
});

// Test teams loaded by an earlier version were named "<name> (test)"; show them without the suffix.
const shownName = (t: { name: string; synthetic?: boolean }) => (t.synthetic ? t.name.replace(/ \(test\)$/, "") : t.name);
const clean = (list: string[]) => [...new Map(list.map(s => [s.trim().toLowerCase(), s.trim()])).values()].filter(Boolean);
const NAME = z.string().trim().min(1).max(100);
const INDUSTRIES = ["Technology", "Manufacturing", "Retail & e-commerce", "Healthcare", "Education & training", "Finance & insurance", "Logistics & transport", "Energy & utilities", "Construction & property", "Hospitality & tourism", "Agriculture & food", "Public sector & non-profit", "Professional services", "Other"] as const;
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501+"] as const;
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
// Company registration (e.g. a Malaysian SSM number such as 202001012345 or 123456-X) and business licence numbers are
// checked for plausible format only.
const REG = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 \-/]{2,28}[A-Za-z0-9]$/, "Enter a valid company registration number");
const LICENSE = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 \-/.]{1,38}[A-Za-z0-9]$/, "Enter a valid business licence number");
const regKey = (v: string) => v.toUpperCase().replace(/[\s\-/]/g, "");
const Registration = z.object({
  name: text(2, 150), registrationNumber: REG, licenseNumber: LICENSE,
  industry: z.enum(INDUSTRIES), companySize: z.enum(SIZES),
  addressLine: text(3, 200), city: text(2, 100), state: text(2, 100), postcode: text(3, 12), country: text(2, 60),
  website: z.string().trim().max(200).regex(/^(https?:\/\/)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/\S*)?$/, "Enter a valid website").or(z.literal("")).optional(),
  contactName: text(2, 100), contactEmail: z.string().trim().email().max(200), contactPhone: z.string().trim().regex(/^\+?[0-9 ()\-]{7,20}$/, "Enter a valid phone number"),
  authorised: z.literal(true), acceptedTerms: z.literal(true),
});
const Details = Registration.omit({ name: true, registrationNumber: true, authorised: true, acceptedTerms: true });
const companyOutput = (o: typeof organizations.$inferSelect) => ({
  name: o.name, registrationNumber: o.registrationNumber, licenseNumber: o.licenseNumber, industry: o.industry, companySize: o.companySize,
  addressLine: o.addressLine, city: o.city, state: o.state, postcode: o.postcode, country: o.country, website: o.website ?? "",
  contactName: o.contactName, contactEmail: o.contactEmail, contactPhone: o.contactPhone,
});
const SKILLS = z.array(z.string().trim().min(1).max(60)).max(30);
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from(randomBytes(8), b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");

// Limit join-code guessing: 6 wrong codes per user per 10 minutes (per server instance).
const attempts = new Map<string, { n: number; reset: number }>();
const tooMany = (user: string) => { const a = attempts.get(user); return !!a && a.reset > Date.now() && a.n >= 6; };
const fail = (user: string) => { const a = attempts.get(user); attempts.set(user, a && a.reset > Date.now() ? { ...a, n: a.n + 1 } : { n: 1, reset: Date.now() + 600_000 }); };

async function membership(req: Request) {
  const [m] = await db.select().from(orgMembers).where(eq(orgMembers.userId, uid(req)));
  return m;
}
async function requireAdmin(req: Request, res: Response) {
  const m = await membership(req);
  if (!m || m.role !== "admin") { res.status(403).json({ error: "Administrator access is required" }); return null; }
  return m;
}

// Made-up test employees belong to one company: their ids are "synthetic:<orgId>:<n>". Removing them also removes their profiles.
async function removeSyntheticPeople(tx: Tx, orgId: string) {
  const prefix = `${SYNTHETIC_PREFIX}${orgId}:%`;
  await tx.delete(learningProgress).where(like(learningProgress.userId, prefix));
  await tx.delete(learnerProfiles).where(like(learnerProfiles.userId, prefix));
  await tx.delete(orgMembers).where(and(eq(orgMembers.orgId, orgId), like(orgMembers.userId, prefix)));
}

// Used when a person leaves a company or deletes their workspace. If no administrator is left, the company is removed.
export { INDUSTRIES, SIZES };
export async function removeUserFromOrg(tx: Tx, userId: string) {
  const [m] = await tx.select().from(orgMembers).where(eq(orgMembers.userId, userId));
  if (!m) return;
  const keys = (await tx.select({ id: orgRecommendations.id }).from(orgRecommendations).where(eq(orgRecommendations.orgId, m.orgId))).map(r => `org:${r.id}`);
  if (keys.length) await tx.delete(learningProgress).where(and(eq(learningProgress.userId, userId), inArray(learningProgress.stepKey, keys)));
  await tx.delete(orgMembers).where(eq(orgMembers.id, m.id));
  const admins = await tx.select({ id: orgMembers.id }).from(orgMembers).where(and(eq(orgMembers.orgId, m.orgId), eq(orgMembers.role, "admin")));
  if (!admins.length) {
    await tx.delete(orgRecommendations).where(eq(orgRecommendations.orgId, m.orgId));
    await tx.delete(orgTeams).where(eq(orgTeams.orgId, m.orgId));
    await removeSyntheticPeople(tx, m.orgId);
    await tx.delete(orgMembers).where(eq(orgMembers.orgId, m.orgId));
    await tx.delete(organizations).where(eq(organizations.id, m.orgId));
  }
}

// ---- Any signed-in user -------------------------------------------------------------------------------------
router.get("/org/me", async (req, res) => {
  const m = await membership(req);
  if (!m) { res.json({ org: null, canRegister: true }); return; }
  const [org] = await db.select().from(organizations).where(eq(organizations.id, m.orgId));
  const teams = (await db.select({ id: orgTeams.id, name: orgTeams.name, synthetic: orgTeams.synthetic }).from(orgTeams).where(eq(orgTeams.orgId, m.orgId)).orderBy(orgTeams.name)).map(t => ({ id: t.id, name: shownName(t) }));
  const recs = await db.select().from(orgRecommendations)
    .where(and(eq(orgRecommendations.orgId, m.orgId), m.teamId ? or(isNull(orgRecommendations.teamId), eq(orgRecommendations.teamId, m.teamId)) : isNull(orgRecommendations.teamId)))
    .orderBy(orgRecommendations.createdAt);
  res.json({
    org: { id: org.id, name: org.name, registrationNumber: org.registrationNumber }, role: m.role, sharing: m.shareWithAdmin, sharedAt: m.sharedAt, teamId: m.teamId, teams,
    assignments: recs.map(r => ({ id: r.id, skill: r.skill, note: r.note, hours: r.hours, teamId: r.teamId })),
  });
});

router.post("/org", async (req, res) => {
  // Any signed-in user without an existing company membership can register. Admin access is granted only by this
  // server-created membership row, so personal and administrator workspaces can share one Clerk identity safely.
  const parsed = Registration.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const field = String(first?.path?.[0] ?? "");
    res.status(400).json({ error: field === "authorised" || field === "acceptedTerms" ? "Confirm that you are authorised to register this company and accept the data-use terms" : first?.message && first.message !== "Invalid input" ? first.message : `Check the ${field || "company"} details and try again`, field });
    return;
  }
  if (await membership(req)) { res.status(409).json({ error: "You already belong to a company. Leave it first." }); return; }
  const d = parsed.data;
  const [dup] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.registrationKey, regKey(d.registrationNumber)));
  if (dup) { res.status(409).json({ error: "A company with this registration number is already registered. Ask its administrator for a join code.", field: "registrationNumber" }); return; }
  const org = await db.transaction(async tx => {
    const [o] = await tx.insert(organizations).values({
      name: d.name, registrationNumber: d.registrationNumber, registrationKey: regKey(d.registrationNumber), licenseNumber: d.licenseNumber,
      industry: d.industry, companySize: d.companySize, addressLine: d.addressLine, city: d.city, state: d.state, postcode: d.postcode, country: d.country,
      website: d.website || null, contactName: d.contactName, contactEmail: d.contactEmail, contactPhone: d.contactPhone,
      joinCode: newCode(), createdByUserId: uid(req), termsAcceptedAt: new Date(),
    }).returning();
    await tx.insert(orgMembers).values({ orgId: o.id, userId: uid(req), role: "admin" });
    return o;
  });
  res.status(201).json({ id: org.id, name: org.name });
});

router.post("/org/join", async (req, res) => {
  const parsed = z.object({ code: z.string().trim().min(4).max(20) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter the join code from your company" }); return; }
  if (tooMany(uid(req))) { res.status(429).json({ error: "Too many attempts. Try again in a few minutes." }); return; }
  if (await membership(req)) { res.status(409).json({ error: "You already belong to a company. Leave it first." }); return; }
  const [org] = await db.select().from(organizations).where(eq(organizations.joinCode, parsed.data.code.toUpperCase().replace(/[\s-]/g, "")));
  if (!org) { fail(uid(req)); res.status(404).json({ error: "That join code was not found. Check it with your company." }); return; }
  await db.insert(orgMembers).values({ orgId: org.id, userId: uid(req), role: "member" });
  res.status(201).json({ id: org.id, name: org.name });
});

// Employees control what the administrator can see. Sharing is off until the employee turns it on.
router.put("/org/membership", async (req, res) => {
  const parsed = z.object({ shareWithAdmin: z.boolean().optional(), teamId: z.string().uuid().nullable().optional() }).safeParse(req.body);
  const m = await membership(req);
  if (!parsed.success || !m) { res.status(400).json({ error: "Check your choices and try again" }); return; }
  const set: Partial<typeof orgMembers.$inferInsert> = {};
  if (parsed.data.shareWithAdmin !== undefined) {
    if (parsed.data.shareWithAdmin) {
      const [p] = await db.select({ u: learnerProfiles.userId }).from(learnerProfiles).where(eq(learnerProfiles.userId, uid(req)));
      if (!p) { res.status(409).json({ error: "Save your skills profile before sharing it with your company" }); return; }
    }
    set.shareWithAdmin = parsed.data.shareWithAdmin; set.sharedAt = parsed.data.shareWithAdmin ? new Date() : null;
  }
  if (parsed.data.teamId !== undefined) {
    if (parsed.data.teamId) {
      const [t] = await db.select({ id: orgTeams.id }).from(orgTeams).where(and(eq(orgTeams.id, parsed.data.teamId), eq(orgTeams.orgId, m.orgId)));
      if (!t) { res.status(404).json({ error: "Team not found" }); return; }
    }
    set.teamId = parsed.data.teamId;
  }
  if (Object.keys(set).length) await db.update(orgMembers).set(set).where(eq(orgMembers.id, m.id));
  res.json({ sharing: set.shareWithAdmin ?? m.shareWithAdmin, teamId: set.teamId === undefined ? m.teamId : set.teamId });
});

router.delete("/org/membership", async (req, res) => {
  await db.transaction(tx => removeUserFromOrg(tx, uid(req)));
  res.status(204).end();
});

// ---- Administrator only -------------------------------------------------------------------------------------
router.get("/org/admin", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const [org] = await db.select().from(organizations).where(eq(organizations.id, admin.orgId));
  const [teams, recs, people] = await Promise.all([
    db.select().from(orgTeams).where(eq(orgTeams.orgId, admin.orgId)).orderBy(orgTeams.name),
    db.select().from(orgRecommendations).where(eq(orgRecommendations.orgId, admin.orgId)).orderBy(orgRecommendations.createdAt),
    db.select().from(orgMembers).where(and(eq(orgMembers.orgId, admin.orgId), eq(orgMembers.role, "member"))),
  ]);
  const sharing = people.filter(p => p.shareWithAdmin);
  const ids = sharing.map(p => p.userId);
  const [profiles, progress] = ids.length ? await Promise.all([
    db.select().from(learnerProfiles).where(inArray(learnerProfiles.userId, ids)),
    db.select().from(learningProgress).where(and(inArray(learningProgress.userId, ids), eq(learningProgress.completed, true))),
  ]) : [[], []];
  const recIds = new Set(recs.map(r => r.id));
  res.json({
    org: { id: org.id, name: org.name, joinCode: org.joinCode }, company: companyOutput(org),
    counts: { joined: people.length, sharing: sharing.length },
    teams: teams.map(t => ({ id: t.id, name: shownName(t), requiredSkills: t.requiredSkills, synthetic: t.synthetic })),
    recommendations: recs.map(r => ({ id: r.id, teamId: r.teamId, skill: r.skill, note: r.note, hours: r.hours, createdAt: r.createdAt })),
    members: sharing.map(p => {
      const profile = profiles.find(x => x.userId === p.userId);
      const done = progress.filter(x => x.userId === p.userId);
      return {
        id: p.id, synthetic: p.userId.startsWith(SYNTHETIC_PREFIX), name: profile?.name ?? "Employee", currentRole: profile?.currentRole ?? "", skills: profile?.skills ?? [], goalRoleId: profile?.goalRoleId ?? null,
        teamId: p.teamId, completedSteps: done.length, completedRecommendations: done.map(x => x.stepKey).filter(k => k.startsWith("org:") && recIds.has(k.slice(4))).map(k => k.slice(4)),
      };
    }),
  });
});

router.post("/org/admin/teams", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const parsed = z.object({ name: NAME, requiredSkills: SKILLS }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter a team name and up to 30 skills" }); return; }
  const [t] = await db.insert(orgTeams).values({ orgId: admin.orgId, name: parsed.data.name, requiredSkills: clean(parsed.data.requiredSkills) }).returning();
  res.status(201).json({ id: t.id, name: t.name, requiredSkills: t.requiredSkills });
});

router.put("/org/admin/teams/:id", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const parsed = z.object({ name: NAME, requiredSkills: SKILLS }).safeParse(req.body);
  const id = z.string().uuid().safeParse(req.params.id);
  if (!parsed.success || !id.success) { res.status(400).json({ error: "Check the team details" }); return; }
  const [t] = await db.update(orgTeams).set({ name: parsed.data.name, requiredSkills: clean(parsed.data.requiredSkills) })
    .where(and(eq(orgTeams.id, id.data), eq(orgTeams.orgId, admin.orgId))).returning();
  if (!t) { res.status(404).json({ error: "Team not found" }); return; }
  res.json({ id: t.id, name: t.name, requiredSkills: t.requiredSkills });
});

router.delete("/org/admin/teams/:id", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid team" }); return; }
  await db.transaction(async tx => {
    await tx.update(orgMembers).set({ teamId: null }).where(and(eq(orgMembers.teamId, id.data), eq(orgMembers.orgId, admin.orgId)));
    await tx.update(orgRecommendations).set({ teamId: null }).where(and(eq(orgRecommendations.teamId, id.data), eq(orgRecommendations.orgId, admin.orgId)));
    await tx.delete(orgTeams).where(and(eq(orgTeams.id, id.data), eq(orgTeams.orgId, admin.orgId)));
  });
  res.status(204).end();
});

router.put("/org/admin/members/:id/team", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const id = z.string().uuid().safeParse(req.params.id);
  const body = z.object({ teamId: z.string().uuid().nullable() }).safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ error: "Check the team choice" }); return; }
  if (body.data.teamId) {
    const [t] = await db.select({ id: orgTeams.id }).from(orgTeams).where(and(eq(orgTeams.id, body.data.teamId), eq(orgTeams.orgId, admin.orgId)));
    if (!t) { res.status(404).json({ error: "Team not found" }); return; }
  }
  // Only employees who are currently sharing can be managed; the administrator cannot touch anyone else.
  const rows = await db.update(orgMembers).set({ teamId: body.data.teamId })
    .where(and(eq(orgMembers.id, id.data), eq(orgMembers.orgId, admin.orgId), eq(orgMembers.role, "member"), eq(orgMembers.shareWithAdmin, true))).returning({ id: orgMembers.id });
  if (!rows.length) { res.status(404).json({ error: "Employee not found or not sharing" }); return; }
  res.json({ teamId: body.data.teamId });
});

router.post("/org/admin/recommendations", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const parsed = z.object({ teamId: z.string().uuid().nullable(), skill: z.string().trim().min(1).max(60), note: z.string().trim().max(300).default(""), hours: z.number().int().min(1).max(200).default(6) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose a skill, a team and check the note" }); return; }
  if (parsed.data.teamId) {
    const [t] = await db.select({ id: orgTeams.id }).from(orgTeams).where(and(eq(orgTeams.id, parsed.data.teamId), eq(orgTeams.orgId, admin.orgId)));
    if (!t) { res.status(404).json({ error: "Team not found" }); return; }
  }
  const same = await db.select({ id: orgRecommendations.id }).from(orgRecommendations).where(and(eq(orgRecommendations.orgId, admin.orgId), eq(orgRecommendations.skill, parsed.data.skill),
    parsed.data.teamId ? eq(orgRecommendations.teamId, parsed.data.teamId) : isNull(orgRecommendations.teamId)));
  if (same.length) { res.status(409).json({ error: "This training is already recommended to that team" }); return; }
  const [r] = await db.insert(orgRecommendations).values({ orgId: admin.orgId, ...parsed.data }).returning();
  res.status(201).json({ id: r.id, teamId: r.teamId, skill: r.skill, note: r.note, hours: r.hours });
});

router.delete("/org/admin/recommendations/:id", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid recommendation" }); return; }
  await db.transaction(async tx => {
    const removed = await tx.delete(orgRecommendations).where(and(eq(orgRecommendations.id, id.data), eq(orgRecommendations.orgId, admin.orgId))).returning({ id: orgRecommendations.id });
    // Only clean up progress if the recommendation really belonged to this administrator's company.
    if (removed.length) await tx.delete(learningProgress).where(eq(learningProgress.stepKey, `org:${id.data}`));
  });
  res.status(204).end();
});

// Registration number and legal name are fixed once registered; the rest can be kept up to date.
router.put("/org/admin/details", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const parsed = Details.safeParse(req.body);
  if (!parsed.success) { const first = parsed.error.issues[0]; res.status(400).json({ error: first?.message && first.message !== "Invalid input" ? first.message : `Check the ${String(first?.path?.[0] ?? "company")} details`, field: String(first?.path?.[0] ?? "") }); return; }
  const d = parsed.data;
  const [o] = await db.update(organizations).set({ ...d, website: d.website || null }).where(eq(organizations.id, admin.orgId)).returning();
  res.json(companyOutput(o));
});

// ---- Synthetic test data ------------------------------------------------------------------------------------
// 30 made-up employees in 10 made-up teams, so an administrator can try skill gaps, ranking and training without real people.
// They count as employees who share. They can be removed again at any time; real employees and teams are never touched.
router.post("/org/admin/sample-data", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const prefix = `${SYNTHETIC_PREFIX}${admin.orgId}:`;
  const [already] = await db.select({ id: orgMembers.id }).from(orgMembers).where(and(eq(orgMembers.orgId, admin.orgId), like(orgMembers.userId, `${prefix}%`)));
  if (already) { res.status(409).json({ error: "Test data is already loaded. Remove it first to load it again." }); return; }
  const data = buildSyntheticData(); const now = new Date();
  await db.transaction(async tx => {
    const teams = await tx.insert(orgTeams).values(data.teams.map(t => ({ orgId: admin.orgId, name: t.name, requiredSkills: t.requiredSkills, synthetic: true }))).returning({ id: orgTeams.id });
    const ids = data.employees.map((_, i) => `${prefix}${i + 1}`);
    await tx.insert(learnerProfiles).values(data.employees.map((e, i) => ({ userId: ids[i], name: e.name, currentRole: e.currentRole, experience: "Synthetic test profile", skills: e.skills, interests: [] as string[], goalRoleId: e.goalRoleId })));
    await tx.insert(orgMembers).values(data.employees.map((e, i) => ({ orgId: admin.orgId, userId: ids[i], role: "member", shareWithAdmin: true, sharedAt: now, teamId: teams[e.teamIndex].id })));
  });
  res.status(201).json({ teams: data.teams.length, employees: data.employees.length });
});

router.delete("/org/admin/sample-data", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  await db.transaction(async tx => {
    await removeSyntheticPeople(tx, admin.orgId);
    const teams = await tx.select({ id: orgTeams.id }).from(orgTeams).where(and(eq(orgTeams.orgId, admin.orgId), eq(orgTeams.synthetic, true)));
    const ids = teams.map(t => t.id);
    if (ids.length) {
      const recs = await tx.select({ id: orgRecommendations.id }).from(orgRecommendations).where(and(eq(orgRecommendations.orgId, admin.orgId), inArray(orgRecommendations.teamId, ids)));
      if (recs.length) await tx.delete(learningProgress).where(inArray(learningProgress.stepKey, recs.map(r => `org:${r.id}`)));
      await tx.delete(orgRecommendations).where(and(eq(orgRecommendations.orgId, admin.orgId), inArray(orgRecommendations.teamId, ids)));
      await tx.update(orgMembers).set({ teamId: null }).where(and(eq(orgMembers.orgId, admin.orgId), inArray(orgMembers.teamId, ids)));
      await tx.delete(orgTeams).where(and(eq(orgTeams.orgId, admin.orgId), inArray(orgTeams.id, ids)));
    }
  });
  res.status(204).end();
});

router.post("/org/admin/join-code", async (req, res) => {
  const admin = await requireAdmin(req, res); if (!admin) return;
  const code = newCode();
  await db.update(organizations).set({ joinCode: code }).where(eq(organizations.id, admin.orgId));
  res.json({ joinCode: code });
});

export default router;
