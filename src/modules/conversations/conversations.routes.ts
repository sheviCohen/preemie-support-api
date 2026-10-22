import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import * as controller from "./conversations.controller";

export const conversationsRouter = Router();
conversationsRouter.use(authenticate);

conversationsRouter.get("/", controller.list);
conversationsRouter.post("/direct", controller.openDirect);
conversationsRouter.get("/:id/messages", controller.messages);
conversationsRouter.post("/:id/messages", controller.send);
conversationsRouter.post("/:id/read", controller.read);
