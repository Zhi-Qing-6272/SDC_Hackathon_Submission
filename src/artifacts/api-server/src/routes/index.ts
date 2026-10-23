import { Router, type IRouter } from "express";
import healthRouter from "./health";
import trendsRouter from "./trends";
import vacanciesRouter from "./vacancies";
import marketRouter from "./market";
import workspaceRouter from "./workspace";
import orgRouter from "./org";
import teamsRouter from "./teams";
import supportRouter from "./support";

const router: IRouter = Router();

router.use(healthRouter);
router.use(trendsRouter);
router.use(vacanciesRouter);
router.use(marketRouter);
router.use(workspaceRouter);
router.use(orgRouter);
router.use(teamsRouter);
router.use(supportRouter);

export default router;
