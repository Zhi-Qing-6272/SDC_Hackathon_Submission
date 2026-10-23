// Progress, levels and badges. Everything here is derived from data the app already stores
// (profile skills, completed step keys, company-assigned training), so nothing extra needs saving.
export type BadgeId = 'profile' | 'first' | 'going' | 'collector' | 'committed' | 'halfway' | 'pathway' | 'explorer' | 'team' | 'uptodate';
export type Badge = { id: BadgeId; title: string; description: string; earned: boolean; value: number; target: number };
export const XP_PER_STEP = 10, XP_PER_BADGE = 20;
export const LEVELS = [{ name: 'Starter', xp: 0 }, { name: 'Builder', xp: 30 }, { name: 'Practitioner', xp: 80 }, { name: 'Specialist', xp: 150 }, { name: 'Pathfinder', xp: 250 }, { name: 'Navigator', xp: 400 }];

export type ProgressInput = {
  skillCount: number;
  completedKeys: string[];
  steps: { key: string }[] | null;   // steps of the direction the learner is following
  assignedKeys: string[];            // "org:<id>" keys for training assigned by the company
};

export function summarise({ skillCount, completedKeys, steps, assignedKeys }: ProgressInput) {
  const done = new Set(completedKeys);
  const own = completedKeys.filter(k => !k.startsWith('org:'));
  const total = steps?.length ?? 0, stepsDone = steps ? steps.filter(s => done.has(s.key)).length : 0;
  const directions = new Set(own.map(k => k.split(':')[0]));
  const assignedDone = assignedKeys.filter(k => done.has(k)).length;
  const mk = (id: BadgeId, title: string, description: string, value: number, target: number): Badge => ({ id, title, description, value: Math.min(value, target), target, earned: value >= target });
  const badges: Badge[] = [
    mk('profile', 'Profile builder', 'Add 5 skills to your profile', skillCount, 5),
    mk('first', 'First step', 'Complete your first learning step', completedKeys.length, 1),
    mk('going', 'Getting going', 'Complete 3 learning steps', completedKeys.length, 3),
    mk('collector', 'Skill collector', 'Complete 5 learning steps', completedKeys.length, 5),
    mk('committed', 'Committed learner', 'Complete 10 learning steps', completedKeys.length, 10),
    mk('halfway', 'Halfway there', 'Finish half of your chosen pathway', total >= 2 ? stepsDone : 0, Math.max(1, Math.ceil(total / 2))),
    mk('pathway', 'Pathway complete', 'Finish every step of your chosen pathway', total >= 1 ? stepsDone : 0, Math.max(1, total)),
    mk('explorer', 'Explorer', 'Learn in 2 different directions', directions.size, 2),
    mk('team', 'Team player', 'Complete training assigned by your company', assignedDone, 1),
    mk('uptodate', 'Up to date', 'Finish all training assigned by your company', assignedKeys.length ? assignedDone : 0, Math.max(1, assignedKeys.length)),
  ];
  const earned = badges.filter(b => b.earned);
  const xp = completedKeys.length * XP_PER_STEP + earned.length * XP_PER_BADGE;
  let li = 0; LEVELS.forEach((l, i) => { if (xp >= l.xp) li = i; });
  const next = LEVELS[li + 1];
  const nextBadge = badges.filter(b => !b.earned).sort((a, b) => (b.value / b.target) - (a.value / a.target))[0] ?? null;
  return {
    done: stepsDone, total, pct: total ? Math.round(100 * stepsDone / total) : 0,
    xp, level: li + 1, levelName: LEVELS[li].name, nextLevelName: next?.name ?? null, xpToNext: next ? next.xp - xp : 0,
    levelPct: next ? Math.round(100 * (xp - LEVELS[li].xp) / (next.xp - LEVELS[li].xp)) : 100,
    badges, earned, nextBadge, stepsCompleted: completedKeys.length,
  };
}
export type Summary = ReturnType<typeof summarise>;
