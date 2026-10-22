import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import * as controller from "./profile.controller";

export const profileRouter = Router();

profileRouter.use(authenticate);

// הפרופיל המשותף (אמא + תינוק): רק אמהות. איש צוות רואה את הפרטים שלו דרך GET /api/auth/me.
profileRouter.get("/", requireRole("MOTHER"), controller.getProfile);
profileRouter.put("/", requireRole("MOTHER"), controller.updateProfile);

// תמונת פרופיל: לכל משתמש/ת מחוברים
profileRouter.put("/avatar", controller.setAvatar);
profileRouter.delete("/avatar", controller.removeAvatar);
