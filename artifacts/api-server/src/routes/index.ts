import { Router, type IRouter } from "express";
import healthRouter from "./health";
import suppliesRouter from "./supplies";
import usageLogsRouter from "./usage-logs";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/supplies", suppliesRouter);
router.use("/usage-logs", usageLogsRouter);
router.use("/dashboard", dashboardRouter);

export default router;
