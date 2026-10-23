import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import { getAuth } from "@clerk/express";
import { buildSystemPrompt, faqAnswer } from "../lib/support-faq";

// In-app assistant. With an AI key set (ANTHROPIC_API_KEY for Claude, or GEMINI_API_KEY for Google Gemini, which has a free tier) it answers any question and knows Nexora's own product facts;
// otherwise (or if the AI service is unreachable) built-in answers are returned. The key never leaves the server.
// Nothing from a conversation is stored or logged.
const router: IRouter = Router();

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(1500) })).min(1).max(12),
  page: z.string().max(60).optional(),
  account: z.enum(["visitor", "personal", "member", "admin"]).optional(),
  lang: z.enum(["EN", "BM", "中文"]).default("EN"),
});

const LIMIT = 30, WINDOW = 3_600_000; // messages per person (or IP) per hour, per server instance
const hits = new Map<string, { n: number; reset: number }>();
function limited(key: string) {
  const now = Date.now(); const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + WINDOW }); if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k); return false; }
  h.n += 1; return h.n > LIMIT;
}
const who = (req: Request) => getAuth(req).userId ?? (req.get("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "anon");

type Source = { title: string; url: string };
type Block = { type: string; text?: string; citations?: { type?: string; url?: string; title?: string }[]; [k: string]: unknown };
type Answer = { reply: string; sources: Source[]; searched: boolean };

// Claude's built-in web search runs on Anthropic's side; it must be enabled for your organisation in the Anthropic Console
// (Settings > Privacy). Turn it off here with ANTHROPIC_WEB_SEARCH=off. If the API refuses the tool, the question is asked again without it.
async function callClaude(key: string, body: z.infer<typeof Body>, withSearch: boolean): Promise<Answer | null> {
  const base = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
  const messages: { role: string; content: unknown }[] = body.messages.map(m => ({ ...m }));
  const sources: Source[] = []; let text = ""; let searched = false;
  for (let turn = 0; turn < 3; turn++) {
    const r = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: 1200, system: buildSystemPrompt(body.lang, body.page, body.account), messages,
        ...(withSearch ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }] } : {}),
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { content?: Block[]; stop_reason?: string };
    const blocks = j.content ?? [];
    for (const b of blocks) {
      if (b.type === "server_tool_use") searched = true;
      if (b.type === "text") {
        text += b.text ?? "";
        for (const c of b.citations ?? []) if (c.url && /^https?:\/\//i.test(c.url) && !sources.some(s => s.url === c.url)) sources.push({ title: (c.title || new URL(c.url).hostname).slice(0, 120), url: c.url });
      }
    }
    // A long search turn can pause; hand the partial answer back so Claude finishes it.
    if (j.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: blocks }); continue; }
    break;
  }
  text = text.trim();
  return text ? { reply: text, sources: sources.slice(0, 5), searched } : null;
}

// Google Gemini (has a free tier). Search grounding is Google's own web search; sources come back as grounding chunks.
async function callGemini(key: string, body: z.infer<typeof Body>, withSearch: boolean): Promise<Answer | null> {
  const base = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const r = await fetch(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(body.lang, body.page, body.account) }] },
      contents: body.messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 1200 },
      ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] } }[] };
  const c = j.candidates?.[0];
  const text = (c?.content?.parts ?? []).map(p => p.text ?? "").join("").trim();
  if (!text) return null;
  const sources: Source[] = [];
  for (const g of c?.groundingMetadata?.groundingChunks ?? []) {
    const u = g.web?.uri;
    if (u && /^https?:\/\//i.test(u) && !sources.some(x => x.url === u)) sources.push({ title: (g.web?.title || new URL(u).hostname).slice(0, 120), url: u });
  }
  return { reply: text, sources: sources.slice(0, 5), searched: sources.length > 0 };
}

// Which AI answers: ANTHROPIC_API_KEY (Claude) if set, otherwise GEMINI_API_KEY (Google Gemini, free tier available).
// AI_PROVIDER=anthropic|gemini forces one. With neither key the caller falls back to the built-in answers.
async function askAI(body: z.infer<typeof Body>): Promise<Answer | null> {
  const wanted = (process.env.AI_PROVIDER ?? "").toLowerCase();
  const claude = process.env.ANTHROPIC_API_KEY, gemini = process.env.GEMINI_API_KEY;
  const use = wanted === "gemini" ? (gemini ? "gemini" : null) : wanted === "anthropic" ? (claude ? "anthropic" : null) : claude ? "anthropic" : gemini ? "gemini" : null;
  if (!use) return null;
  const search = (process.env.AI_WEB_SEARCH ?? process.env.ANTHROPIC_WEB_SEARCH ?? "on").toLowerCase() !== "off";
  const call = (withSearch: boolean) => (use === "gemini" ? callGemini(gemini!, body, withSearch) : callClaude(claude!, body, withSearch));
  if (search) { try { const a = await call(true); if (a) return a; } catch { /* try again without search */ } }
  try { return await call(false); } catch { return null; }
}

router.post("/support/chat", async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid message." }); return; }
  if (limited(who(req))) { res.status(429).json({ error: "Too many messages. Please try again later." }); return; }
  const body = parsed.data;
  if (body.messages[body.messages.length - 1]!.role !== "user") { res.status(400).json({ error: "Invalid message." }); return; }
  const ai = await askAI(body);
  if (ai) { res.json({ reply: ai.reply, sources: ai.sources, mode: "ai" }); return; }
  res.json({ reply: faqAnswer(body.messages[body.messages.length - 1]!.content, body.lang), mode: "faq" });
});

export default router;
