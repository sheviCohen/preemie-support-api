import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/** מגביל ניסיונות התחברות והרשמה (הגנה מפני ניחוש סיסמאות). כבוי בבדיקות האוטומטיות. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "יותר מדי ניסיונות. נסי שוב בעוד כמה דקות",
    },
  },
});
