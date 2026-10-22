import { z } from "zod";
import { isValidTimeZone } from "../lib/timezone";

// עזרים לבניית סכמות ולידציה עם הודעות שגיאה בעברית.

/** טקסט חובה (אחרי הסרת רווחים בקצוות) */
export const requiredText = (label: string, max: number) =>
  z
    .string({
      required_error: `${label} הוא שדה חובה`,
      invalid_type_error: `${label} חייב להיות טקסט`,
    })
    .trim()
    .min(1, `${label} הוא שדה חובה`)
    .max(max, `${label} ארוך מדי (עד ${max} תווים)`);

/** טקסט לא חובה */
export const optionalText = (label: string, max: number) =>
  z
    .string({ invalid_type_error: `${label} חייב להיות טקסט` })
    .trim()
    .max(max, `${label} ארוך מדי (עד ${max} תווים)`)
    .optional();

/** טקסט לא חובה שאפשר גם לאפס אותו על ידי שליחת null */
export const nullableText = (label: string, max: number) =>
  z
    .string({ invalid_type_error: `${label} חייב להיות טקסט` })
    .trim()
    .max(max, `${label} ארוך מדי (עד ${max} תווים)`)
    .nullable()
    .optional();

/** תאריך ושעה בפורמט ISO עם אזור זמן, למשל 2026-10-22T09:00:00Z */
export const dateTimeSchema = z
  .string({
    required_error: "חובה להזין תאריך ושעה",
    invalid_type_error: "תאריך ושעה חייבים להיות טקסט בפורמט ISO",
  })
  .datetime({
    offset: true,
    message: "תאריך ושעה לא תקינים. הפורמט הנדרש הוא למשל 2026-10-22T09:00:00Z",
  })
  .transform((value) => new Date(value));

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** תאריך בלבד (2026-09-01) או תאריך ושעה מלאים */
export const dateOrDateTimeSchema = z
  .string({
    required_error: "חובה להזין תאריך",
    invalid_type_error: "התאריך חייב להיות טקסט",
  })
  .trim()
  .refine(
    (value) =>
      DATE_ONLY.test(value)
        ? !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
        : z.string().datetime({ offset: true }).safeParse(value).success,
    { message: "תאריך לא תקין. הפורמט הנדרש הוא למשל 2026-09-01" },
  )
  .transform((value) => new Date(DATE_ONLY.test(value) ? `${value}T00:00:00.000Z` : value));

/** מזהה מספרי חיובי (מגיע גם מ-URL כטקסט) */
export const idParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: "המזהה חייב להיות מספר" })
    .int("המזהה חייב להיות מספר שלם")
    .positive("המזהה חייב להיות חיובי"),
});

/** אזור זמן תקין (IANA), למשל Asia/Jerusalem */
export const timeZoneSchema = z
  .string({ invalid_type_error: "אזור הזמן חייב להיות טקסט" })
  .refine(isValidTimeZone, { message: "אזור זמן לא תקין. למשל Asia/Jerusalem" });
