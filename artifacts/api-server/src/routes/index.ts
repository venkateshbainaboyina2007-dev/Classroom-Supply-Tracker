import { Router, type IRouter } from "express";
import healthRouter from "./health";
import suppliesRouter from "./supplies";
import usageLogsRouter from "./usage-logs";
import dashboardRouter from "./dashboard";
import classroomsRouter from "./classrooms";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/supplies", suppliesRouter);
router.use("/usage-logs", usageLogsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/classrooms", classroomsRouter);

export default router;
