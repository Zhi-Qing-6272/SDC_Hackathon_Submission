import { Router, type IRouter } from "express";
import { loadHimalayas } from "../lib/himalayas";

const router: IRouter = Router();

// Public remote postings from Himalayas (credit and apply links go back to himalayas.app; see lib/himalayas.ts).
router.get("/vacancies", async (_req, res) => {
  try {
    const d = await loadHimalayas();
    res.json({ fetchedAt: d.fetchedAt, vacancies: d.jobs.map(({ published: _p, ...v }) => v) });
  } catch {
    res.status(502).json({ error: "Vacancy source could not be reached" });
  }
});

export default router;
