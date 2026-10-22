import type { Request, RequestHandler } from "express";
import { prisma } from "../db/prisma";
import type { Role } from "../domain/constants";
import type { AuthUser } from "../types/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { forbidden, unauthorized } from "../utils/httpError";
import { verifyAccessToken } from "../utils/jwt";

/**
 * אימות: דורש Bearer Token תקין.
 * ללא Token או עם Token לא תקין / שפג תוקפו: 401.
 * המשתמש/ת נקבעים לפי ה-Token ונטענים מחדש ממסד הנתונים, כך שחשבון שנמחק מאבד גישה.
 */
export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw unauthorized("UNAUTHORIZED", "נדרשת התחברות. חסר Bearer Token בכותרת Authorization");
  }

  const token = header.slice("Bearer ".length).trim();
  let userId: number;
  try {
    userId = verifyAccessToken(token).userId;
  } catch {
    throw unauthorized("INVALID_TOKEN", "הטוקן אינו תקין או שפג תוקפו. יש להתחבר מחדש");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, staffRole: true, firstName: true, lastName: true },
  });
  if (!user) {
    throw unauthorized("INVALID_TOKEN", "המשתמש/ת לא נמצאו. יש להתחבר מחדש");
  }

  req.user = user;
  next();
});

/** הרשאות: מאפשר רק לסוגי המשתמשים שצוינו. אחרת 403. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(unauthorized("UNAUTHORIZED", "נדרשת התחברות"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(forbidden());
      return;
    }
    next();
  };
}

/** מחזיר את המשתמש/ת המחוברים (אחרי authenticate) */
export function requireUser(req: Request): AuthUser {
  if (!req.user) {
    throw unauthorized("UNAUTHORIZED", "נדרשת התחברות");
  }
  return req.user;
}
