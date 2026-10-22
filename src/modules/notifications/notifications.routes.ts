import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import * as controller from "./notifications.controller";

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get("/", controller.list);
// חשוב: read-all לפני :id/read
notificationsRouter.post("/read-all", controller.readAll);
notificationsRouter.post("/:id/read", controller.read);
