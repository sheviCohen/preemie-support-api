import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import * as controller from "./schedule.controller";

export const scheduleRouter = Router();
scheduleRouter.use(authenticate);

scheduleRouter.get("/", controller.list);
scheduleRouter.post("/", controller.create);
scheduleRouter.get("/:id", controller.get);
scheduleRouter.put("/:id", controller.update);
scheduleRouter.delete("/:id", controller.remove);
