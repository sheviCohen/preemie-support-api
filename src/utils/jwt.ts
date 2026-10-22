import { sign, verify, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../domain/constants";

export interface AccessTokenPayload {
  userId: number;
  role: Role;
}

/** יוצר Access Token עם תוקף מוגבל. המזהה של המשתמש/ת נשמר בתוך ה-Token. */
export function signAccessToken(user: { id: number; role: Role }): string {
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };
  return sign({ sub: String(user.id), role: user.role }, env.JWT_SECRET, options);
}

/** מאמת Token. זורק שגיאה אם הוא לא תקין, מזויף או שפג תוקפו. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  if (typeof decoded === "string" || decoded.sub === undefined) {
    throw new Error("Invalid token payload");
  }
  const userId = Number(decoded.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid token subject");
  }
  return { userId, role: (decoded as { role?: Role }).role as Role };
}
