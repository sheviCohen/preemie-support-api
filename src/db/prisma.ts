import { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../config/env";

export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

/** מקבל גם את הלקוח הרגיל וגם לקוח בתוך טרנזקציה */
export type DbClient = PrismaClient | Prisma.TransactionClient;

/** האם השגיאה היא הפרה של אילוץ ייחודיות (למשל אימייל שכבר קיים) */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
