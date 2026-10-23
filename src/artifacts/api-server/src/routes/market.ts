import { Router, type IRouter } from "express";
import { HimalayasError, loadHimalayas } from "../lib/himalayas";
import { buildSnapshot } from "../lib/market-stats";

// Job-market demand and AI-hiring signals, computed from the Himalayas remote-jobs feed (see lib/himalayas.ts).
// No extra API calls: it summarises the same cached sample used for vacancy matching.
const router: IRouter = Router();

router.get("/market/himalayas", async (req, res) => {
  try {
    const d = await loadHimalayas(req.query.refresh === "1");
    res.json({ ...buildSnapshot(d.jobs, d), ...(d.stale ? { stale: true } : {}) });
  } catch (e) {
    const status = e instanceof HimalayasError ? e.status : undefined;
    res.status(status === 429 ? 429 : 502).json({ error: status === 401 || status === 403 ? "upstream_auth" : status === 429 ? "rate_limited" : "upstream_error" });
  }
});

export default router;
