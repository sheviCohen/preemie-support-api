import type { DbClient } from "../db/prisma";
import type { StaffRole } from "../domain/constants";
import { getOrCreateGeneralConversation } from "../modules/conversations/general";
import { hashPassword } from "../utils/password";

// נתוני הפתיחה הנחוצים לכל מערכת: אנשי הצוות והצ'אט הכללי. בטוח להריץ שוב ושוב.

export interface SeedStaff {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  staffRole: StaffRole;
}

// השמות והאימיילים כאן בדויים (דומיין example.test שמור לדוגמאות ולא קיים באמת).
export const SEED_STAFF: readonly SeedStaff[] = [
  { email: "nurse@example.test", firstName: "רחל", lastName: "לוי", phone: "0500000001", staffRole: "NURSE" },
  { email: "social@example.test", firstName: "מירב", lastName: "כהן", phone: "0500000002", staffRole: "SOCIAL_WORKER" },
  { email: "therapist@example.test", firstName: "דנה", lastName: "ברק", phone: "0500000003", staffRole: "DEVELOPMENTAL_THERAPIST" },
];

/** יוצר את אנשי הצוות אם אינם קיימים, ומצרף את כולם לצ'אט הכללי. לא משנה סיסמה של קיימים. */
export async function bootstrap(db: DbClient, staffPassword: string): Promise<{ created: number; staffIds: number[] }> {
  const passwordHash = await hashPassword(staffPassword);
  const general = await getOrCreateGeneralConversation(db);
  let created = 0;
  const staffIds: number[] = [];

  for (const staff of SEED_STAFF) {
    const existing = await db.user.findUnique({ where: { email: staff.email }, select: { id: true } });
    const user =
      existing ??
      (await db.user.create({
        data: { ...staff, passwordHash, role: "STAFF" },
        select: { id: true },
      }));
    if (!existing) {
      created += 1;
    }
    staffIds.push(user.id);
    await db.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: general.id, userId: user.id } },
      create: { conversationId: general.id, userId: user.id, lastReadAt: new Date() },
      update: {},
    });
  }
  return { created, staffIds };
}
