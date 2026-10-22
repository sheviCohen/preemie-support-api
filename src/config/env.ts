import "dotenv/config";
import { z } from "zod";

// כל ההגדרות של השרת נקראות ממשתני סביבה (קובץ .env במחשב, או מסך Environment ב-Render).
// אם משהו חובה חסר או שגוי, השרת לא עולה ומדפיס הסבר ברור.

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL חסר. זו כתובת החיבור למסד הנתונים"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET חייב להיות באורך 32 תווים לפחות"),
  JWT_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().default("24h")),
  CORS_ORIGINS: z.preprocess(
    emptyToUndefined,
    z.string().default("http://localhost:5173,http://localhost:3000"),
  ),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(14).default(10),
  NOTIFICATION_BACKLOG_DELAY_MS: z.coerce.number().int().min(0).default(3000),
  APPOINTMENT_REMINDER_MINUTES: z.coerce.number().int().min(1).max(1440).default(30),
  REMINDER_INTERVAL_MS: z.coerce.number().int().min(1000).default(60000),
  REMINDER_JOB_ENABLED: z.preprocess(emptyToUndefined, booleanString.default("true")),
  SEED_STAFF_PASSWORD: z.preprocess(
    emptyToUndefined,
    z.string().min(8, "SEED_STAFF_PASSWORD חייבת להכיל לפחות 8 תווים").optional(),
  ),
  SEED_DEMO_DATA: z.preprocess(emptyToUndefined, booleanString.default("false")),
  SEED_DEMO_PASSWORD: z.preprocess(
    emptyToUndefined,
    z.string().min(8, "SEED_DEMO_PASSWORD חייבת להכיל לפחות 8 תווים").optional(),
  ),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`הגדרות הסביבה אינן תקינות:\n${lines.join("\n")}`);
  }
  return parsed.data;
}

export const env = loadEnv();

/** רשימת הכתובות שמותר להן לפנות לשרת. "*" אומר שכולן מותרות. */
export function parseCorsOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter((origin) => origin.length > 0);
}

export const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS);
