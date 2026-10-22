import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma";
import { runReminderCycle } from "../../src/jobs/reminders";
import { registerMother } from "../helpers/api";
import { hasTestDb, resetDb } from "../helpers/db";

describe.skipIf(!hasTestDb)("תזכורות", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("יוצר תזכורת אחת בלבד לפריט שמתחיל בקרוב, גם אם המחזור רץ כמה פעמים", async () => {
    const { id } = await registerMother();
    const now = new Date();
    await prisma.scheduleItem.createMany({
      data: [
        { ownerId: id, createdById: id, category: "APPOINTMENT", type: "OTHER_APPOINTMENT", title: "קרוב", startAt: new Date(now.getTime() + 20 * 60_000) },
        { ownerId: id, createdById: id, category: "CARE_TASK", type: "MEDICATION", title: "תרופה", startAt: new Date(now.getTime() + 10 * 60_000) },
        { ownerId: id, createdById: id, category: "APPOINTMENT", type: "OTHER_APPOINTMENT", title: "רחוק", startAt: new Date(now.getTime() + 5 * 60 * 60_000) },
        { ownerId: id, createdById: id, category: "APPOINTMENT", type: "OTHER_APPOINTMENT", title: "עבר", startAt: new Date(now.getTime() - 60 * 60_000) },
      ],
    });

    expect(await runReminderCycle(now)).toBe(2);
    expect(await runReminderCycle(now)).toBe(0);

    const notifications = await prisma.notification.findMany({ where: { userId: id }, orderBy: { id: "asc" } });
    expect(notifications.map((n) => n.type).sort()).toEqual(["APPOINTMENT_REMINDER", "CARE_TASK_REMINDER"]);
    expect(notifications.every((n) => !n.isRead)).toBe(true);
  });
});
