import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authRateLimiter } from "../../middleware/rateLimit";
import * as controller from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, controller.register);
authRouter.post("/login", authRateLimiter, controller.login);
authRouter.get("/me", authenticate, controller.me);
