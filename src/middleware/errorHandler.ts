import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";

/** מבנה אחיד לכל השגיאות: { error: { code, message, details? } } */
function errorBody(code: string, message: string, details?: unknown) {
  return { error: { code, message, ...(details !== undefined ? { details } : {}) } };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(errorBody("NOT_FOUND", `הנתיב ${req.method} ${req.path} לא קיים`));
};

function bodyParserErrorType(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "type" in error) {
    const type = (error as { type: unknown }).type;
    return typeof type === "string" ? type : undefined;
  }
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json(errorBody(error.code, error.message, error.details));
    return;
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    res
      .status(400)
      .json(errorBody("VALIDATION_ERROR", details[0]?.message ?? "הנתונים שנשלחו אינם תקינים", details));
    return;
  }

  const parserType = bodyParserErrorType(error);
  if (parserType === "entity.parse.failed") {
    res.status(400).json(errorBody("INVALID_JSON", "גוף הבקשה אינו JSON תקין"));
    return;
  }
  if (parserType === "entity.too.large") {
    res.status(413).json(errorBody("PAYLOAD_TOO_LARGE", "גוף הבקשה גדול מדי"));
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json(errorBody("CONFLICT", "הערך כבר קיים במערכת"));
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json(errorBody("NOT_FOUND", "הפריט המבוקש לא נמצא"));
      return;
    }
    if (error.code === "P2003") {
      res.status(400).json(errorBody("INVALID_REFERENCE", "הפריט מפנה לנתון שלא קיים או שאי אפשר למחוק"));
      return;
    }
  }

  // שגיאה לא צפויה: מדפיסים ללוג של השרת, ולא חושפים פרטים ללקוח
  console.error("Unexpected error:", error);
  res.status(500).json(errorBody("INTERNAL_ERROR", "אירעה שגיאה בשרת. נסי שוב מאוחר יותר"));
};
