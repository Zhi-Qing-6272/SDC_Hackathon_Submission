// Pure aggregation over a sample of Himalayas postings (no I/O), shared by the server and the preview build.
// Skills are matched in each posting's title, categories and excerpt, so these are indicative counts, not exact demand.
type Job = { position: string; company: string; tags: string[]; summary: string };
const SKILLS: [string, RegExp][] = [
  ["Python", /\bpython\b/], ["SQL", /\bsql\b|postgres|mysql/], ["JavaScript", /\bjavascript\b|\bnode\.?js\b|\breact\b|\btypescript\b/], ["Java", /\bjava\b/],
  ["Data analysis", /data analy|analytics|business intelligence|\bbi\b/], ["Excel", /\bexcel\b|spreadsheet/],
  ["Customer support", /customer (support|service|success)|help ?desk/], ["CRM", /\bcrm\b|salesforce|hubspot/],
  ["Project coordination", /project (management|manager|coordinat)|scrum|\bagile\b/], ["Digital marketing", /digital marketing|\bseo\b|content marketing|social media|growth marketing/],
  ["Cybersecurity", /cyber ?security|infosec|security engineer|penetration/], ["Cloud computing", /\bcloud\b|\baws\b|\bazure\b|\bgcp\b|kubernetes|devops/],
];
const AI_TERMS: [string, RegExp][] = [
  ["artificial intelligence", /\bai\b|artificial intelligence/], ["machine learning", /machine learning|\bml\b|deep learning/],
  ["generative ai", /generative|\bllms?\b|large language model|prompt engineer/], ["data science", /data scien/],
];
export type MarketSnapshot = {
  sourceName: string; sourceUrl: string; fetchedAt: string; sourceUpdatedAt: string | null; sampleSize: number; totalPostings: number | null; stale?: boolean;
  skills: { skill: string; count: number; share: number }[]; ai: { term: string; count: number; share: number }[]; topEmployers: { name: string; count: number }[];
  attribution: string; attributionUrl: string;
};
export function buildSnapshot(jobs: Job[], meta: { fetchedAt: string; sourceUpdatedAt: string | null; totalCount: number | null }): MarketSnapshot {
  const texts = jobs.map(j => ` ${j.position} ${j.tags.join(" ")} ${j.summary} `.toLowerCase().replace(/[-_]+/g, " "));
  const n = jobs.length;
  const count = (re: RegExp) => texts.reduce((c, t) => c + (re.test(t) ? 1 : 0), 0);
  const skills = SKILLS.map(([skill, re]) => { const c = count(re); return { skill, count: c, share: n ? c / n : 0 }; }).sort((a, b) => b.count - a.count);
  const ai = AI_TERMS.map(([term, re]) => { const c = count(re); return { term, count: c, share: n ? c / n : 0 }; }).sort((a, b) => b.count - a.count);
  const aiRe = new RegExp(AI_TERMS.map(([, r]) => r.source).join("|"));
  const byCo = new Map<string, number>();
  jobs.forEach((j, i) => { if (j.company && aiRe.test(texts[i])) byCo.set(j.company, (byCo.get(j.company) ?? 0) + 1); });
  const topEmployers = [...byCo.entries()].map(([name, c]) => ({ name, count: c })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 8);
  return { sourceName: "Himalayas remote jobs", sourceUrl: "https://himalayas.app", fetchedAt: meta.fetchedAt, sourceUpdatedAt: meta.sourceUpdatedAt, sampleSize: n, totalPostings: meta.totalCount, skills, ai, topEmployers, attribution: "Jobs by Himalayas", attributionUrl: "https://himalayas.app" };
}
