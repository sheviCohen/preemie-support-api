import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { corsOrigins } from "./config/env";
import { prisma } from "./db/prisma";
import { mountSwagger } from "./docs/swagger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { articlesRouter } from "./modules/articles/articles.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { conversationsRouter } from "./modules/conversations/conversations.routes";
import { healthFundsRouter } from "./modules/healthFunds/healthFunds.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { profileRouter } from "./modules/profile/profile.routes";
import { scheduleRouter } from "./modules/schedule/schedule.routes";
import { mothersRouter, staffRouter } from "./modules/users/users.routes";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  // Render עובד מאחורי Proxy. נדרש כדי שהגבלת הקצב תזהה כתובת אמיתית.
  app.set("trust proxy", 1);

  // התיעוד מורכב לפני helmet, כי ה-CSP של helmet חוסם את הסקריפטים של Swagger UI
  mountSwagger(app);

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins.includes("*") ? true : corsOrigins,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );
  // 1MB: מספיק לתמונת פרופיל קטנה בפורמט base64
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "ok" });
    } catch {
      res.status(503).json({ status: "error", database: "unreachable" });
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/mothers", mothersRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api/schedule", scheduleRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/articles", articlesRouter);
  app.use("/api/health-funds", healthFundsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
