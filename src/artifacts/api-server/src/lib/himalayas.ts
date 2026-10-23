// Himalayas remote-jobs API client (https://himalayas.app/docs/remote-jobs-api).
// The API key is optional but raises rate limits; set HIMALAYAS_API_KEY on the server only. It is never sent to the browser.
// Terms: show a visible Himalayas credit with a link to himalayas.app, send every Apply action to `applicationLink`,
// and do not redistribute the jobs to other job boards. Himalayas refreshes its data every 24h, so we cache for 6h.
const BASE = "https://himalayas.app/jobs/api";
const PAGE_SIZE = 20, MAX_PAGES = 10; // 200 postings per refresh = 10 requests (limit with a key: 60/minute, 10,000/day)
const TTL_MS = 6 * 60 * 60 * 1000, MIN_FORCE_MS = 10 * 60 * 1000;

export type HimalayasJob = { id: string; position: string; company: string; location: string; url: string; tags: string[]; summary: string; published: string | null };
export type HimalayasData = { jobs: HimalayasJob[]; sourceUpdatedAt: string | null; fetchedAt: string; totalCount: number | null };
export class HimalayasError extends Error { constructor(message: string, readonly status?: number) { super(message); } }

let cache: { at: number; data: HimalayasData } | undefined;
let inflight: Promise<HimalayasData> | undefined;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map(x => x.trim()) : typeof v === "string" && v.trim() ? [v.trim()] : []);
// The docs describe dates both as ISO strings and as Unix milliseconds, so accept either (seconds too).
function toIso(v: unknown): string | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
  const d = n !== null ? new Date(n < 10_000_000_000 ? n * 1000 : n) : typeof v === "string" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

export function normaliseJob(raw: unknown): HimalayasJob | null {
  if (typeof raw !== "object" || raw === null) return null;
  const j = raw as Record<string, unknown>;
  const position = str(j.title), url = str(j.applicationLink);
  if (!position || !/^https?:\/\//.test(url)) return null; // Apply must go through applicationLink, so a job without one is unusable
  const restrictions = strings(j.locationRestrictions);
  const tags = [...new Set([...strings(j.categories), ...strings(j.parentCategories), ...strings(j.seniority)])];
  return { id: str(j.guid) || url, position, company: str(j.companyName), location: restrictions.length ? restrictions.join(", ") : "Worldwide", url, tags, summary: str(j.excerpt).slice(0, 400), published: toIso(j.pubDate) };
}

async function get(params: Record<string, string>): Promise<Record<string, unknown>> {
  const key = process.env.HIMALAYAS_API_KEY?.trim();
  const r = await fetch(`${BASE}?${new URLSearchParams(params)}`, {
    headers: { Accept: "application/json", "User-Agent": "Nexora/1.0 (career planning; https://himalayas.app credit shown)", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    signal: AbortSignal.timeout(12_000),
  });
  if (!r.ok) throw new HimalayasError(`Himalayas returned HTTP ${r.status}`, r.status);
  const body: unknown = await r.json();
  if (typeof body !== "object" || body === null || !Array.isArray((body as { jobs?: unknown }).jobs)) throw new HimalayasError("Himalayas returned an unexpected format");
  return body as Record<string, unknown>;
}

async function walk(): Promise<HimalayasData> {
  const jobs: HimalayasJob[] = []; const seen = new Set<string>();
  let cursor: string | undefined, updated: unknown, total: number | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    let body: Record<string, unknown>;
    try { body = await get({ limit: String(PAGE_SIZE), ...(cursor ? { cursor } : {}) }); }
    catch (e) { if (page > 0 && jobs.length) break; throw e; } // a later page failing (e.g. 429) still leaves a usable partial snapshot
    if (page === 0) { updated = body.updatedAt; total = typeof body.totalCount === "number" ? body.totalCount : null; }
    for (const raw of body.jobs as unknown[]) { const j = normaliseJob(raw); if (j && !seen.has(j.id)) { seen.add(j.id); jobs.push(j); } }
    cursor = typeof body.nextCursor === "string" && body.nextCursor ? body.nextCursor : undefined;
    if (!cursor) break;
  }
  if (!jobs.length) throw new HimalayasError("Himalayas returned no usable jobs");
  return { jobs, sourceUpdatedAt: toIso(updated), fetchedAt: new Date().toISOString(), totalCount: total };
}

// Cached for 6 hours; a forced refresh is honoured at most every 10 minutes; if Himalayas fails we serve the last snapshot.
export async function loadHimalayas(force = false): Promise<HimalayasData & { stale?: boolean }> {
  const age = cache ? Date.now() - cache.at : Infinity;
  if (cache && age <= TTL_MS && !(force && age > MIN_FORCE_MS)) return cache.data;
  inflight ??= walk().finally(() => { inflight = undefined; });
  try { const data = await inflight; cache = { at: Date.now(), data }; return data; }
  catch (e) { if (cache) return { ...cache.data, stale: true }; throw e; }
}
export const resetHimalayasCache = () => { cache = undefined; inflight = undefined; };
