import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import * as controller from "./users.controller";

export const mothersRouter = Router();
mothersRouter.use(authenticate);
mothersRouter.get("/", controller.listMothers);
mothersRouter.get("/:id/profile", requireRole("STAFF"), controller.getMotherProfile);

export const staffRouter = Router();
staffRouter.use(authenticate);
staffRouter.get("/", controller.listStaff);
