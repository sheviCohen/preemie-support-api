import { execSync } from "node:child_process";

// לפני הבדיקות: מריץ את ה-Migrations על מסד הבדיקות (ורק עליו).
export default function setup(): void {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn("TEST_DATABASE_URL לא מוגדר: בדיקות האינטגרציה ידולגו.");
    return;
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
