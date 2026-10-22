import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import * as controller from "./articles.controller";

export const articlesRouter = Router();
articlesRouter.use(authenticate);

// קריאה: כל משתמש/ת מחוברים. כתיבה: צוות בלבד, ועריכה/מחיקה רק של המאמר שהוספת.
articlesRouter.get("/", controller.list);
articlesRouter.get("/:id", controller.get);
articlesRouter.post("/", requireRole("STAFF"), controller.create);
articlesRouter.put("/:id", requireRole("STAFF"), controller.update);
articlesRouter.delete("/:id", requireRole("STAFF"), controller.remove);
