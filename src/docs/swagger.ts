import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi";

/** Swagger UI ב-/api-docs. כפתור Authorize מקבל את ה-Token מההתחברות. */
export function mountSwagger(app: Express): void {
  app.get("/api-docs.json", (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument as Record<string, unknown>, {
      customSiteTitle: "תיעוד API - תמיכה לאמהות של פגים",
      swaggerOptions: { persistAuthorization: true },
    }),
  );
}
