import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { DEFAULT_TIME_ZONE, STAFF_BOOKABLE_TYPES, typesForCategory } from "../../domain/constants";
import { SCHEDULE_TYPE_LABELS } from "../../domain/labels";
import { generateOccurrences, TooManyOccurrencesError, withTimeOfDay } from "../../lib/recurrence";
import type { AuthUser } from "../../types/auth";
import { badRequest, forbidden, notFound } from "../../utils/httpError";
import { createNotification } from "../notifications/notifications.service";
import { PUBLIC_USER_SELECT, toUserSummary } from "../users/user.serializers";
import type {
  CreateScheduleInput,
  ListScheduleQuery,
  UpdateScheduleInput,
} from "./schedule.schemas";

const itemInclude = {
  owner: { select: PUBLIC_USER_SELECT },
  staff: { select: PUBLIC_USER_SELECT },
  createdBy: { select: { id: true, role: true } },
} satisfies Prisma.ScheduleItemInclude;

type ItemRow = Prisma.ScheduleItemGetPayload<{ include: typeof itemInclude }>;

/** מי רשאי/ת לצפות: בעלת הפריט, או איש הצוות המשויך אליו */
function canView(user: AuthUser, item: { ownerId: number; staffId: number | null }): boolean {
  return item.ownerId === user.id || item.staffId === user.id;
}

/**
 * מי רשאי/ת לערוך ולמחוק: רק מי שיצר/ה את הפריט.
 * אמא לא עורכת פגישה שאיש צוות קבע לה, ואיש צוות לא עורך פריט שאמא יצרה.
 */
function canModify(
  user: AuthUser,
  item: { ownerId: number; staffId: number | null; createdById: number },
): boolean {
  if (item.createdById !== user.id) {
    return false;
  }
  return user.role === "MOTHER" ? item.ownerId === user.id : item.staffId === user.id;
}

export function toScheduleDto(item: ItemRow, user: AuthUser) {
  return {
    id: item.id,
    category: item.category,
    type: item.type,
    title: item.title,
    notes: item.notes,
    withWhom: item.withWhom,
    startAt: item.startAt.toISOString(),
    seriesId: item.seriesId,
    owner: toUserSummary(item.owner),
    staff: item.staff ? toUserSummary(item.staff) : null,
    createdByRole: item.createdBy.role,
    canEdit: canModify(user, item),
  };
}

async function loadVisibleItem(user: AuthUser, id: number): Promise<ItemRow> {
  const item = await prisma.scheduleItem.findUnique({ where: { id }, include: itemInclude });
  // פריט של מישהי אחרת מוחזר כ"לא נמצא", כדי לא לחשוף שהוא קיים
  if (!item || !canView(user, item)) {
    throw notFound("הפריט לא נמצא בלוח");
  }
  return item;
}

export async function listSchedule(user: AuthUser, query: ListScheduleQuery) {
  const where: Prisma.ScheduleItemWhereInput = {
    ...(user.role === "MOTHER"
      ? { ownerId: user.id }
      : { staffId: user.id, ...(query.ownerId ? { ownerId: query.ownerId } : {}) }),
    ...(query.category ? { category: query.category } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.from || query.to
      ? { startAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  };
  const items = await prisma.scheduleItem.findMany({
    where,
    include: itemInclude,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: query.limit,
  });
  return { items: items.map((item) => toScheduleDto(item, user)) };
}

export async function getScheduleItem(user: AuthUser, id: number) {
  const item = await loadVisibleItem(user, id);
  return { item: toScheduleDto(item, user) };
}

export async function createSchedule(user: AuthUser, input: CreateScheduleInput) {
  let ownerId: number;
  let staffId: number | null = null;

  if (user.role === "MOTHER") {
    if (input.ownerId !== undefined && input.ownerId !== user.id) {
      throw forbidden("אפשר להוסיף פריטים רק ללוח של עצמך");
    }
    ownerId = user.id;
  } else {
    if (input.ownerId === undefined) {
      throw badRequest("VALIDATION_ERROR", "חובה לבחור אמא (ownerId)");
    }
    if (input.category !== "APPOINTMENT" || !(STAFF_BOOKABLE_TYPES as readonly string[]).includes(input.type)) {
      throw badRequest(
        "VALIDATION_ERROR",
        "איש צוות יכול לקבוע רק צ'אט מתוזמן או פגישה עם צוות",
      );
    }
    const mother = await prisma.user.findFirst({
      where: { id: input.ownerId, role: "MOTHER" },
      select: { id: true },
    });
    if (!mother) {
      throw notFound("האמא לא נמצאה");
    }
    ownerId = mother.id;
    staffId = user.id;
  }

  const timeZone = input.timeZone ?? DEFAULT_TIME_ZONE;
  let occurrences: Date[];
  try {
    occurrences = generateOccurrences(
      input.startAt,
      input.recurrence
        ? {
            every: input.recurrence.every,
            unit: input.recurrence.unit,
            count: input.recurrence.count,
            until: input.recurrence.until,
          }
        : undefined,
      timeZone,
    );
  } catch (error) {
    if (error instanceof TooManyOccurrencesError) {
      throw badRequest("TOO_MANY_OCCURRENCES", error.message);
    }
    throw error;
  }

  const seriesId = input.recurrence ? randomUUID() : null;

  const created = await prisma.$transaction(async (tx) => {
    // יצירה אחת-אחת כדי לקבל מזהים לפי הסדר
    const rows: ItemRow[] = [];
    for (const startAt of occurrences) {
      rows.push(
        await tx.scheduleItem.create({
          data: {
            ownerId,
            createdById: user.id,
            staffId,
            withWhom: input.withWhom || null,
            category: input.category,
            type: input.type,
            title: input.title,
            notes: input.notes || null,
            startAt,
            seriesId,
          },
          include: itemInclude,
        }),
      );
    }
    return rows;
  });

  // איש צוות קבע לאמא: האמא מקבלת התראה עם קישור ליומן (אחת לכל הסדרה)
  const first = created[0];
  if (user.role === "STAFF" && first) {
    const staffName = `${first.staff?.firstName ?? ""} ${first.staff?.lastName ?? ""}`.trim();
    const when = new Intl.DateTimeFormat("he-IL", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone,
    }).format(first.startAt);
    await createNotification({
      userId: ownerId,
      type: "APPOINTMENT_CREATED_BY_STAFF",
      title: "נקבעה לך פגישה חדשה",
      body:
        created.length > 1
          ? `${staffName} קבעה לך סדרת פגישות (${created.length}), הראשונה ב-${when}`
          : `${staffName} קבעה לך ${SCHEDULE_TYPE_LABELS[first.type]} ב-${when}`,
      link: `/schedule?date=${first.startAt.toISOString().slice(0, 10)}`,
      scheduleItemId: first.id,
    });
  }

  return { items: created.map((item) => toScheduleDto(item, user)), seriesId };
}

async function itemsForScope(item: ItemRow, scope: "single" | "series"): Promise<{ id: number; startAt: Date }[]> {
  if (scope === "series" && item.seriesId) {
    return prisma.scheduleItem.findMany({
      where: { seriesId: item.seriesId, createdById: item.createdById },
      select: { id: true, startAt: true },
      orderBy: { startAt: "asc" },
    });
  }
  return [{ id: item.id, startAt: item.startAt }];
}

export async function updateSchedule(user: AuthUser, id: number, input: UpdateScheduleInput) {
  const item = await loadVisibleItem(user, id);
  if (!canModify(user, item)) {
    throw forbidden("אפשר לערוך רק פריטים שיצרת בעצמך");
  }
  if (input.type !== undefined && !typesForCategory(item.category).includes(input.type)) {
    throw badRequest("VALIDATION_ERROR", "הסוג לא מתאים לקטגוריה של הפריט");
  }
  if (
    user.role === "STAFF" &&
    input.type !== undefined &&
    !(STAFF_BOOKABLE_TYPES as readonly string[]).includes(input.type)
  ) {
    throw badRequest("VALIDATION_ERROR", "איש צוות יכול לקבוע רק צ'אט מתוזמן או פגישה עם צוות");
  }

  const timeZone = input.timeZone ?? DEFAULT_TIME_ZONE;
  const targets = await itemsForScope(item, input.scope);
  const timeChanged = input.startAt !== undefined;
  const common: Prisma.ScheduleItemUpdateManyMutationInput = {
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
    ...(input.withWhom !== undefined ? { withWhom: input.withWhom || null } : {}),
  };

  await prisma.$transaction(async (tx) => {
    for (const target of targets) {
      let startAt: Date | undefined;
      if (input.startAt !== undefined) {
        // פריט בודד: מועד חדש מלא. כל הסדרה: רק השעה משתנה, והתאריכים נשארים.
        startAt =
          input.scope === "series" && targets.length > 1
            ? withTimeOfDay(target.startAt, input.startAt, timeZone)
            : input.startAt;
      }
      await tx.scheduleItem.update({
        where: { id: target.id },
        data: { ...common, ...(startAt ? { startAt } : {}) },
      });
    }
    if (timeChanged) {
      // מועד חדש: התזכורות הישנות כבר לא נכונות. התזכורת תיווצר מחדש בזמן הנכון.
      await tx.notification.deleteMany({
        where: {
          scheduleItemId: { in: targets.map((target) => target.id) },
          type: { in: ["APPOINTMENT_REMINDER", "CARE_TASK_REMINDER"] },
        },
      });
    }
  });

  const updated = await prisma.scheduleItem.findMany({
    where: { id: { in: targets.map((target) => target.id) } },
    include: itemInclude,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
  });
  return { items: updated.map((row) => toScheduleDto(row, user)) };
}

export async function deleteSchedule(user: AuthUser, id: number, scope: "single" | "series") {
  const item = await loadVisibleItem(user, id);
  if (!canModify(user, item)) {
    throw forbidden("אפשר למחוק רק פריטים שיצרת בעצמך");
  }
  const targets = await itemsForScope(item, scope);
  const result = await prisma.scheduleItem.deleteMany({
    where: { id: { in: targets.map((target) => target.id) } },
  });
  return { deleted: result.count };
}
