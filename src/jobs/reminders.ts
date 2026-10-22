import { prisma, isUniqueViolation } from "../db/prisma";
import { env } from "../config/env";
import { SCHEDULE_TYPE_LABELS } from "../domain/labels";
import { createNotification } from "../modules/notifications/notifications.service";

/**
 * בודק כל דקה אילו פריטים בלו"ז מתחילים בקרוב, ויוצר התראה (פעם אחת לכל פריט ולכל נמען).
 * הכלל "פעם אחת" נאכף במסד הנתונים (אילוץ ייחודי), לכן גם אם שני שרתים רצים אין כפילויות.
 */
export async function runReminderCycle(now: Date = new Date()): Promise<number> {
  const windowEnd = new Date(now.getTime() + env.APPOINTMENT_REMINDER_MINUTES * 60_000);
  const items = await prisma.scheduleItem.findMany({
    where: { startAt: { gt: now, lte: windowEnd } },
    orderBy: { startAt: "asc" },
    take: 500,
  });

  let created = 0;
  for (const item of items) {
    const minutes = Math.max(1, Math.ceil((item.startAt.getTime() - now.getTime()) / 60_000));
    const isAppointment = item.category === "APPOINTMENT";
    const type = isAppointment ? "APPOINTMENT_REMINDER" : "CARE_TASK_REMINDER";
    const recipients = [item.ownerId, ...(item.staffId !== null ? [item.staffId] : [])];

    for (const userId of recipients) {
      try {
        await createNotification({
          userId,
          type,
          title: isAppointment ? "תזכורת לתור" : "תזכורת למשימת טיפול",
          body: `${SCHEDULE_TYPE_LABELS[item.type]}: ${item.title} מתחיל בעוד ${minutes} דקות`,
          link: `/schedule?date=${item.startAt.toISOString().slice(0, 10)}`,
          scheduleItemId: item.id,
        });
        created += 1;
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        // כבר נשלחה תזכורת לפריט הזה
      }
    }
  }
  return created;
}

let timer: NodeJS.Timeout | null = null;

export function startReminderJob(): void {
  if (!env.REMINDER_JOB_ENABLED || timer) {
    return;
  }
  let running = false;
  timer = setInterval(() => {
    if (running) {
      return;
    }
    running = true;
    runReminderCycle()
      .catch((error: unknown) => console.error("מחזור התזכורות נכשל", error))
      .finally(() => {
        running = false;
      });
  }, env.REMINDER_INTERVAL_MS);
  timer.unref();
}

export function stopReminderJob(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
