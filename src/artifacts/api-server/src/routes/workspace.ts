import { Router, type IRouter, type Request } from "express";
import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { db, learnerProfiles, learningProgress, teamMembers } from "@workspace/db";
import { removeUserFromOrg } from "./org";
import { removeUserFromTeams } from "./teams";
import {
  SaveLearnerProfileBody, SaveLearningProgressBody, SaveCareerGoalBody,
  CreateTeamMemberBody, UpdateTeamMemberParams,
} from "@workspace/api-zod";

const router: IRouter = Router();
const owner = (req: Request) => getAuth(req).userId!;
const cleanList = (values: string[]) => [...new Map(values.map(value => [value.trim().toLowerCase(), value.trim()])).values()].filter(Boolean);
const profileOutput = (row: typeof learnerProfiles.$inferSelect) => ({
  name: row.name, currentRole: row.currentRole, experience: row.experience, skills: row.skills, interests: row.interests,
});
const memberOutput = (row: typeof teamMembers.$inferSelect) => ({
  id: row.id, name: row.name, currentRole: row.currentRole, skills: row.skills, targetRoleId: row.targetRoleId, weeklyHours: row.weeklyHours,
});
// Step keys are "<direction-id>:<step title>"; directions and their steps are generated in the frontend.
const validStepKey = /^[a-z0-9-]{2,24}:[A-Za-z0-9 +#.-]{1,80}$/;

// Public trend endpoints stay accessible. Every private endpoint below requires
// a verified Clerk session; ownership is always derived from that session.
router.use(["/workspace", "/profile", "/progress", "/goal", "/team-members"], (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Sign in to access your workspace" });
    return;
  }
  next();
});

router.get("/workspace", async (req, res) => {
  const userId = owner(req);
  const [profiles, progress] = await Promise.all([
    db.select().from(learnerProfiles).where(eq(learnerProfiles.userId, userId)),
    db.select().from(learningProgress).where(and(eq(learningProgress.userId, userId), eq(learningProgress.completed, true))),
  ]);
  const profile = profiles[0];
  res.json({ profile: profile ? profileOutput(profile) : null, completedKeys: progress.map(item => item.stepKey), goalRoleId: profile?.goalRoleId ?? null });
});

router.put("/profile", async (req, res) => {
  const parsed = SaveLearnerProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a name and select at least one skill. Check field lengths." });
    return;
  }
  const input = {
    name: parsed.data.name.trim(), currentRole: parsed.data.currentRole.trim(), experience: parsed.data.experience.trim(),
    skills: cleanList(parsed.data.skills), interests: cleanList(parsed.data.interests),
  };
  if (!input.name || !input.skills.length) {
    res.status(400).json({ error: "A name and at least one skill are required" });
    return;
  }
  const [row] = await db.insert(learnerProfiles).values({ userId: owner(req), ...input })
    .onConflictDoUpdate({ target: learnerProfiles.userId, set: { ...input, updatedAt: new Date() } }).returning();
  res.json(profileOutput(row));
});

router.put("/progress/:stepKey", async (req, res) => {
  const parsed = SaveLearningProgressBody.safeParse(req.body);
  const stepKey = String(req.params.stepKey);
  if (!parsed.success || !validStepKey.test(stepKey)) {
    res.status(400).json({ error: "Choose a valid learning step" });
    return;
  }
  const saved = await db.transaction(async (tx) => {
    // Company-assigned training ("org:<id>") must not change the learner's chosen direction.
    const prefix = stepKey.split(":")[0];
    const profiles = await tx.update(learnerProfiles).set(prefix === "org" ? { updatedAt: new Date() } : { goalRoleId: prefix, updatedAt: new Date() })
      .where(eq(learnerProfiles.userId, owner(req))).returning({ userId: learnerProfiles.userId });
    if (!profiles.length) return false;
    await tx.insert(learningProgress).values({ userId: owner(req), stepKey, completed: parsed.data.completed })
      .onConflictDoUpdate({ target: [learningProgress.userId, learningProgress.stepKey], set: { completed: parsed.data.completed, updatedAt: new Date() } });
    return true;
  });
  if (!saved) {
    res.status(409).json({ error: "Save your skills profile before recording progress" });
    return;
  }
  res.json(parsed.data);
});

router.put("/goal", async (req, res) => {
  const parsed = SaveCareerGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a supported career direction" });
    return;
  }
  const rows = await db.update(learnerProfiles).set({ goalRoleId: parsed.data.roleId, updatedAt: new Date() })
    .where(eq(learnerProfiles.userId, owner(req))).returning({ userId: learnerProfiles.userId });
  if (!rows.length) {
    res.status(409).json({ error: "Save your skills profile before choosing a pathway" });
    return;
  }
  res.json(parsed.data);
});

router.get("/team-members", async (req, res) => {
  const rows = await db.select().from(teamMembers).where(eq(teamMembers.ownerUserId, owner(req))).orderBy(teamMembers.name);
  res.json(rows.map(memberOutput));
});

router.post("/team-members", async (req, res) => {
  const parsed = CreateTeamMemberBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.name.trim()) {
    res.status(400).json({ error: "Enter a name, a valid role, and 1–40 weekly learning hours" });
    return;
  }
  const input = parsed.data;
  const [row] = await db.insert(teamMembers).values({
    ownerUserId: owner(req), name: input.name.trim(), currentRole: input.currentRole.trim(),
    skills: cleanList(input.skills), targetRoleId: input.targetRoleId, weeklyHours: input.weeklyHours,
  }).returning();
  res.status(201).json(memberOutput(row));
});

router.put("/team-members/:id", async (req, res) => {
  const params = UpdateTeamMemberParams.safeParse(req.params);
  const parsed = CreateTeamMemberBody.safeParse(req.body);
  if (!params.success || !parsed.success || !parsed.data.name.trim()) {
    res.status(400).json({ error: "Check the member details and learning hours" });
    return;
  }
  const input = parsed.data;
  const [row] = await db.update(teamMembers).set({
    name: input.name.trim(), currentRole: input.currentRole.trim(), skills: cleanList(input.skills),
    targetRoleId: input.targetRoleId, weeklyHours: input.weeklyHours, updatedAt: new Date(),
  }).where(and(eq(teamMembers.id, params.data.id), eq(teamMembers.ownerUserId, owner(req)))).returning();
  if (!row) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(memberOutput(row));
});

router.delete("/team-members/:id", async (req, res) => {
  const params = UpdateTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid member identifier" });
    return;
  }
  const rows = await db.delete(teamMembers).where(and(eq(teamMembers.id, params.data.id), eq(teamMembers.ownerUserId, owner(req)))).returning({ id: teamMembers.id });
  if (!rows.length) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.status(204).end();
});

router.delete("/workspace", async (req, res) => {
  const userId = owner(req);
  await db.transaction(async tx => {
    await removeUserFromOrg(tx, userId);
    await removeUserFromTeams(tx, userId);
    await tx.delete(teamMembers).where(eq(teamMembers.ownerUserId, userId));
    await tx.delete(learningProgress).where(eq(learningProgress.userId, userId));
    await tx.delete(learnerProfiles).where(eq(learnerProfiles.userId, userId));
  });
  res.status(204).end();
});

export default router;
