import { z } from "zod";
import {
  MAX_SERIES_ITEMS,
  RECURRENCE_UNITS,
  SCHEDULE_CATEGORIES,
  SCHEDULE_TYPES,
  SERIES_SCOPES,
  typesForCategory,
} from "../../domain/constants";
import {
  dateTimeSchema,
  idParamSchema,
  nullableText,
  requiredText,
  timeZoneSchema,
} from "../../utils/zodHelpers";

export const recurrenceSchema = z
  .object({
    every: z
      .number({ required_error: "חובה לציין כל כמה זמן", invalid_type_error: "every חייב להיות מספר" })
      .int("every חייב להיות מספר שלם")
      .min(1, "every חייב להיות לפחות 1")
      .max(52, "every מרבי הוא 52"),
    unit: z.enum(RECURRENCE_UNITS, {
      errorMap: () => ({ message: "unit חייב להיות DAY, WEEK או MONTH" }),
    }),
    count: z
      .number({ invalid_type_error: "count חייב להיות מספר" })
      .int("count חייב להיות מספר שלם")
      .min(2, "count חייב להיות לפחות 2")
      .max(MAX_SERIES_ITEMS, `count מרבי הוא ${MAX_SERIES_ITEMS}`)
      .optional(),
    until: dateTimeSchema.optional(),
  })
  .refine((value) => (value.count === undefined) !== (value.until === undefined), {
    message: "חובה לציין בדיוק אחד מהשניים: count (מספר הופעות) או until (תאריך סיום)",
    path: ["count"],
  });

export const createScheduleSchema = z
  .object({
    ownerId: z.number({ invalid_type_error: "ownerId חייב להיות מספר" }).int().positive().optional(),
    category: z.enum(SCHEDULE_CATEGORIES, {
      errorMap: () => ({ message: "category חייב להיות APPOINTMENT או CARE_TASK" }),
    }),
    type: z.enum(SCHEDULE_TYPES, { errorMap: () => ({ message: "סוג פריט לא תקין" }) }),
    title: requiredText("כותרת", 120),
    notes: nullableText("הערות", 1000),
    withWhom: nullableText("עם מי", 120),
    startAt: dateTimeSchema,
    timeZone: timeZoneSchema.optional(),
    recurrence: recurrenceSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!typesForCategory(value.category).includes(value.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "הסוג לא מתאים לקטגוריה שנבחרה",
      });
    }
    if (value.recurrence?.until && value.recurrence.until.getTime() <= value.startAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recurrence", "until"],
        message: "תאריך הסיום חייב להיות אחרי ההתחלה",
      });
    }
  });
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;

export const updateScheduleSchema = z
  .object({
    type: z.enum(SCHEDULE_TYPES, { errorMap: () => ({ message: "סוג פריט לא תקין" }) }).optional(),
    title: requiredText("כותרת", 120).optional(),
    notes: nullableText("הערות", 1000),
    withWhom: nullableText("עם מי", 120),
    startAt: dateTimeSchema.optional(),
    timeZone: timeZoneSchema.optional(),
    scope: z
      .enum(SERIES_SCOPES, { errorMap: () => ({ message: "scope חייב להיות single או series" }) })
      .default("single"),
  })
  .refine(
    (value) =>
      value.type !== undefined ||
      value.title !== undefined ||
      value.notes !== undefined ||
      value.withWhom !== undefined ||
      value.startAt !== undefined,
    { message: "לא נשלח אף שדה לעדכון" },
  );
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

export const deleteScheduleQuerySchema = z.object({
  scope: z
    .enum(SERIES_SCOPES, { errorMap: () => ({ message: "scope חייב להיות single או series" }) })
    .default("single"),
});

export const listScheduleQuerySchema = z
  .object({
    from: dateTimeSchema.optional(),
    to: dateTimeSchema.optional(),
    category: z.enum(SCHEDULE_CATEGORIES).optional(),
    type: z.enum(SCHEDULE_TYPES).optional(),
    ownerId: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(1000, "limit מרבי 1000").default(500),
  })
  .refine((value) => !value.from || !value.to || value.from.getTime() <= value.to.getTime(), {
    message: "from חייב להיות לפני to",
    path: ["from"],
  });
export type ListScheduleQuery = z.infer<typeof listScheduleQuerySchema>;

export { idParamSchema };
