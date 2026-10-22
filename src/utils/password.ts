import { compare, hash, hashSync } from "bcryptjs";
import { env } from "../config/env";

// סיסמאות נשמרות רק כ-Hash של bcrypt. הסיסמה עצמה לא נשמרת ולא מוחזרת לעולם.

export function hashPassword(password: string): Promise<string> {
  return hash(password, env.BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

// Hash מדומה להשוואה כשהאימייל לא קיים, כדי שזמן התגובה לא יחשוף אם האימייל רשום
const DUMMY_HASH = hashSync("dummy-password-for-timing", env.BCRYPT_ROUNDS);

export async function verifyAgainstDummy(password: string): Promise<void> {
  await compare(password, DUMMY_HASH);
}
