// Synthetic (made-up) people and teams so an administrator can try Nexora without real employees.
// Nothing here is real or based on a real person. Names are invented, skills are spread so that teams differ in how
// well they cover their required skills, which makes the skill-gap ranking worth looking at.
// Pure data, no imports: the browser preview uses a copy of this file.

export const SYNTHETIC_PREFIX = "synthetic:";

type TeamDef = { name: string; skills: string[]; coverage: number; roles: [string, string, string]; goal: string };
const TEAMS: TeamDef[] = [
  { name: "Customer Support", skills: ["Customer support", "Communication", "CRM", "Problem solving"], coverage: 0.9, roles: ["Support Agent", "Senior Support Agent", "Helpdesk Lead"], goal: "success" },
  { name: "Customer Success", skills: ["Customer support", "Communication", "CRM", "Customer research", "Problem solving"], coverage: 0.7, roles: ["Customer Success Associate", "Account Manager", "Onboarding Specialist"], goal: "success" },
  { name: "Data & Analytics", skills: ["SQL", "Data analysis", "Excel", "Python", "Communication"], coverage: 0.55, roles: ["Reporting Analyst", "Junior Data Analyst", "BI Developer"], goal: "analyst" },
  { name: "Business Operations", skills: ["Excel", "Process improvement", "Data analysis", "Project coordination"], coverage: 0.4, roles: ["Operations Executive", "Process Coordinator", "Operations Analyst"], goal: "ops" },
  { name: "Learning & Development", skills: ["Learning design", "Facilitation", "Communication", "Project coordination"], coverage: 0.75, roles: ["Training Coordinator", "Learning Designer", "HR Executive"], goal: "learning" },
  { name: "Web Engineering", skills: ["JavaScript", "Problem solving", "UX design", "Software testing", "Cloud computing"], coverage: 0.5, roles: ["Front-end Developer", "Web Developer", "QA Engineer"], goal: "webdev" },
  { name: "Platform & Security", skills: ["Cloud computing", "Cybersecurity", "Python", "Problem solving"], coverage: 0.3, roles: ["Systems Administrator", "IT Support Engineer", "Network Technician"], goal: "cloud" },
  { name: "Marketing", skills: ["Digital marketing", "Writing", "Data analysis", "Customer research", "Communication"], coverage: 0.85, roles: ["Marketing Executive", "Content Writer", "Social Media Executive"], goal: "marketing" },
  { name: "Sales", skills: ["Sales", "CRM", "Communication", "Customer research", "Excel"], coverage: 0.6, roles: ["Sales Executive", "Business Development Executive", "Sales Coordinator"], goal: "sales" },
  { name: "Finance", skills: ["Finance & accounting", "Excel", "Data analysis", "Process improvement"], coverage: 0.45, roles: ["Accounts Executive", "Bookkeeper", "Finance Assistant"], goal: "finance" },
];

// Invented names, a mix typical of a Malaysian workplace. Not real people.
const NAMES = [
  "Aisyah Rahman", "Wei Jie Tan", "Priya Nair", "Daniel Lim", "Nurul Huda", "Arjun Pillai", "Mei Ling Wong", "Hafiz Ismail", "Sarah Chong", "Kavitha Raj",
  "Farid Hassan", "Jia Hui Lee", "Rajesh Kumar", "Siti Aminah", "Marcus Ng", "Lakshmi Devi", "Amir Zulkifli", "Chloe Tan", "Vikram Singh", "Nadia Yusof",
  "Brandon Ong", "Farah Nabila", "Suresh Menon", "Li Xin Chen", "Irfan Azman", "Grace Teo", "Thevan Subramaniam", "Hana Abdullah", "Jason Lau", "Mira Kaur",
];
const EXTRAS = ["Communication", "Problem solving", "Excel", "Writing", "Project coordination", "Customer research", "AI literacy", "Process improvement"];

export type SyntheticEmployee = { name: string; currentRole: string; skills: string[]; goalRoleId: string; teamIndex: number };
export type SyntheticTeam = { name: string; requiredSkills: string[] };

export function buildSyntheticData(): { teams: SyntheticTeam[]; employees: SyntheticEmployee[] } {
  const employees: SyntheticEmployee[] = [];
  TEAMS.forEach((t, ti) => {
    const k = t.skills.length;
    [0.6, 0, -0.6].forEach((jitter, j) => {
      const n = Math.max(0, Math.min(k, Math.round(t.coverage * k + jitter)));
      const rotated = t.skills.map((_, i) => t.skills[(i + ti + j) % k]).slice(0, n);
      const extraPool = EXTRAS.filter(e => !t.skills.includes(e));
      const extra = extraPool[(ti * 3 + j) % extraPool.length];
      employees.push({ name: NAMES[ti * 3 + j], currentRole: t.roles[j], skills: [...new Set([...rotated, extra])], goalRoleId: t.goal, teamIndex: ti });
    });
  });
  return { teams: TEAMS.map(t => ({ name: t.name, requiredSkills: [...t.skills] })), employees };
}
