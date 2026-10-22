import { prisma } from "../../src/db/prisma";
import { hashPassword } from "../../src/utils/password";

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

/** הגנה: לא מוחקים נתונים אלא אם שם מסד הנתונים מכיל "test" */
function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  const name = url.split("?")[0]?.split("/").pop() ?? "";
  if (!name.toLowerCase().includes("test")) {
    throw new Error(`סירבתי לנקות מסד נתונים "${name}": השם חייב להכיל "test"`);
  }
}

export async function resetDb(): Promise<void> {
  assertTestDatabase();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Notification", "Message", "ConversationMember", "Conversation", "ScheduleItem", "Article", "Baby", "User" RESTART IDENTITY CASCADE',
  );
}

export async function createStaffUser(
  overrides: Partial<{ email: string; staffRole: "NURSE" | "SOCIAL_WORKER" | "DEVELOPMENTAL_THERAPIST"; firstName: string }> = {},
) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? "nurse@example.test",
      passwordHash: await hashPassword("StaffPass123"),
      role: "STAFF",
      staffRole: overrides.staffRole ?? "NURSE",
      firstName: overrides.firstName ?? "רחל",
      lastName: "לוי",
      phone: "0500000001",
    },
  });
}
