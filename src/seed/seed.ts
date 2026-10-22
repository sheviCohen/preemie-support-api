import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { bootstrap, SEED_STAFF } from "./bootstrap";
import { seedDemo } from "./demo";

async function main(): Promise<void> {
  const isProduction = env.NODE_ENV === "production";
  const staffPassword = env.SEED_STAFF_PASSWORD ?? (isProduction ? undefined : "Staff12345!");
  if (!staffPassword) {
    throw new Error("בפרודקשן חובה להגדיר SEED_STAFF_PASSWORD (סיסמה לאנשי הצוות)");
  }

  const { created, staffIds } = await bootstrap(prisma, staffPassword);
  console.log(`אנשי צוות: נוצרו ${created} חדשים (מתוך ${SEED_STAFF.length}).`);
  for (const staff of SEED_STAFF) {
    console.log(`  ${staff.firstName} ${staff.lastName} (${staff.staffRole}): ${staff.email}`);
  }

  if (env.SEED_DEMO_DATA) {
    const demoPassword = env.SEED_DEMO_PASSWORD ?? (isProduction ? undefined : "Demo12345!");
    if (!demoPassword) {
      throw new Error("כדי ליצור נתוני הדגמה בפרודקשן חובה להגדיר SEED_DEMO_PASSWORD");
    }
    await seedDemo(prisma, demoPassword, staffIds);
    console.log("נתוני הדגמה נוצרו (mother1@example.test, mother2@example.test).");
  }
}

main()
  .catch((error: unknown) => {
    console.error("ה-Seed נכשל", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
