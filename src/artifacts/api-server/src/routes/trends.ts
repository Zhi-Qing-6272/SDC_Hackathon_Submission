import { Router, type IRouter } from "express";
import { loadHimalayas } from "../lib/himalayas";
import {
  GetTrendSignalsQueryParams,
  GetTrendSignalsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const SOURCE_NAME = "Himalayas remote jobs";
const SOURCE_URL = "https://himalayas.app";
const SOURCE_API_URL = "https://himalayas.app/docs/remote-jobs-api";
const CACHE_TTL_MS = 5 * 60 * 1000;

type TrendSnapshot = ReturnType<typeof GetTrendSignalsResponse.parse>;

let cachedSnapshot: TrendSnapshot | undefined;
let cachedAt = 0;

const skillAliases: Record<string, string> = {
  ai: "Artificial intelligence",
  "artificial intelligence": "Artificial intelligence",
  "generative ai": "Generative AI",
  "large language models": "Generative AI",
  llm: "Generative AI",
  llms: "Generative AI",
  "machine learning": "Machine learning",
  ml: "Machine learning",
  "deep learning": "Machine learning",
  python: "Python",
  sql: "SQL",
  "data science": "Data analysis",
  "data analysis": "Data analysis",
  "data analytics": "Data analysis",
  analytics: "Data analysis",
  data: "Data analysis",
  cloud: "Cloud computing",
  aws: "Cloud computing",
  azure: "Cloud computing",
  gcp: "Cloud computing",
  cybersecurity: "Cybersecurity",
  security: "Cybersecurity",
  infosec: "Cybersecurity",
  devops: "DevOps",
  kubernetes: "DevOps",
  docker: "DevOps",
  automation: "Automation",
  "product management": "Product management",
  product: "Product management",
  ux: "UX design",
  "ux design": "UX design",
  "user experience": "UX design",
  design: "UX design",
  react: "React",
  typescript: "TypeScript",
  javascript: "JavaScript",
  java: "Java",
  golang: "Go",
  go: "Go",
  "node js": "Node.js",
  nodejs: "Node.js",
  sales: "Sales",
  operations: "Operations",
  "customer success": "Customer success",
  marketing: "Digital marketing",
};

function normalizeTag(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[._/+-]+/g, " ")
    .replace(/\s+/g, " ");
}

// Words that are too ambiguous to look for in free text; they only count when they are an exact category tag.
const AMBIGUOUS = new Set(["go", "data", "product", "design", "security", "operations", "cloud", "automation", "ai", "ml"]);
function skillsFor(job: { position: string; tags: string[]; summary: string }): Set<string> {
  const found = new Set<string>();
  for (const tag of job.tags) { const s = skillAliases[normalizeTag(tag)]; if (s) found.add(s); }
  const text = ` ${normalizeTag(`${job.position} ${job.summary}`)} `;
  for (const [alias, skill] of Object.entries(skillAliases)) {
    if (AMBIGUOUS.has(alias) && alias !== "ai") continue;
    if (alias === "ai" ? /(^|[^a-z])ai([^a-z]|$)/.test(` ${job.position} ${job.summary} `.toLowerCase()) : text.includes(` ${alias} `)) found.add(skill);
  }
  return found;
}

async function fetchSnapshot(force: boolean): Promise<TrendSnapshot> {
  const data = await loadHimalayas(force);
  const jobs = data.jobs;
  const counts = new Map<string, number>();
  for (const job of jobs) for (const skill of skillsFor(job)) counts.set(skill, (counts.get(skill) ?? 0) + 1);

  const signals = [...counts.entries()]
    .map(([skill, count]) => ({ skill, count, share: jobs.length > 0 ? count / jobs.length : 0 }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, 24);

  return GetTrendSignalsResponse.parse({
    sourceName: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    sourceApiUrl: SOURCE_API_URL,
    fetchedAt: data.fetchedAt,
    sourceUpdatedAt: data.sourceUpdatedAt,
    postingCount: jobs.length,
    signals,
  });
}

router.get("/trends", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const refreshValue = req.query.refresh;
  if (
    refreshValue !== undefined &&
    refreshValue !== "true" &&
    refreshValue !== "false"
  ) {
    res.status(400).json({ error: "refresh must be true or false" });
    return;
  }

  const parsedQuery = GetTrendSignalsQueryParams.safeParse({
    refresh: refreshValue === "true",
  });
  if (!parsedQuery.success) {
    res.status(400).json({ error: "Invalid trend query" });
    return;
  }

  const forceRefresh = parsedQuery.data.refresh === true;
  if (
    !forceRefresh &&
    cachedSnapshot &&
    Date.now() - cachedAt < CACHE_TTL_MS
  ) {
    res.json(cachedSnapshot);
    return;
  }

  try {
    const snapshot = await fetchSnapshot(forceRefresh);
    cachedSnapshot = snapshot;
    cachedAt = Date.now();
    res.json(snapshot);
  } catch (error) {
    req.log.warn(
      { error: error instanceof Error ? error.message : "Unknown source error" },
      "Himalayas job source unavailable",
    );
    res.status(503).json({
      error:
        "The Himalayas job feed is temporarily unavailable. Try refreshing later.",
    });
  }
});

export default router;
