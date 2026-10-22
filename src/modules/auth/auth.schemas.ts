import { z } from "zod";
import { LIMITS } from "../../domain/constants";
import {
  dateOrDateTimeSchema,
  nullableText,
  requiredText,
} from "../../utils/zodHelpers";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const emailSchema = z
  .string({ required_error: "אימייל הוא שדה חובה", invalid_type_error: "אימייל חייב להיות טקסט" })
  .trim()
  .toLowerCase()
  .max(254, "כתובת האימייל ארוכה מדי")
  .email("כתובת אימייל לא תקינה");

const phoneSchema = z
  .string({ required_error: "טלפון הוא שדה חובה", invalid_type_error: "טלפון חייב להיות טקסט" })
  .trim()
  .regex(/^[0-9+\-\s()]{7,20}$/, "מספר טלפון לא תקין");

const passwordSchema = z
  .string({ required_error: "סיסמה היא שדה חובה", invalid_type_error: "סיסמה חייבת להיות טקסט" })
  .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
  .max(72, "הסיסמה ארוכה מדי (עד 72 תווים)");

/** שדות התינוק. משמשים גם להרשמה וגם (כחלקיים) לעריכת פרופיל. */
export const babyShape = {
  name: requiredText("שם התינוק", 60),
  birthDate: dateOrDateTimeSchema.refine((date) => date.getTime() <= Date.now() + ONE_DAY_MS, {
    message: "תאריך הלידה לא יכול להיות בעתיד",
  }),
  gestationalWeek: z
    .number({
      required_error: "שבוע הלידה הוא שדה חובה",
      invalid_type_error: "שבוע הלידה חייב להיות מספר",
    })
    .int("שבוע הלידה חייב להיות מספר שלם")
    .min(LIMITS.gestationalWeekMin, `שבוע הלידה חייב להיות בין ${LIMITS.gestationalWeekMin} ל-${LIMITS.gestationalWeekMax}`)
    .max(LIMITS.gestationalWeekMax, `שבוע הלידה חייב להיות בין ${LIMITS.gestationalWeekMin} ל-${LIMITS.gestationalWeekMax}`),
  birthWeightGrams: z
    .number({
      required_error: "משקל הלידה הוא שדה חובה",
      invalid_type_error: "משקל הלידה חייב להיות מספר",
    })
    .int("משקל הלידה חייב להיות מספר שלם (בגרמים)")
    .positive("משקל הלידה חייב להיות חיובי")
    .max(6000, "משקל לידה גבוה מדי לתינוק פג"),
  notes: nullableText("הערות", 1000),
};

/** שדות האמא. משמשים גם להרשמה וגם (כחלקיים) לעריכת פרופיל. */
export const motherShape = {
  firstName: requiredText("שם פרטי", 50),
  lastName: requiredText("שם משפחה", 50),
  phone: phoneSchema,
  email: emailSchema,
  city: nullableText("עיר", 60),
};

export const registerSchema = z.object({
  ...motherShape,
  password: passwordSchema,
  baby: z.object(babyShape, { required_error: "פרטי התינוק הם שדה חובה" }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "סיסמה היא שדה חובה", invalid_type_error: "סיסמה חייבת להיות טקסט" })
    .min(1, "סיסמה היא שדה חובה"),
});
export type LoginInput = z.infer<typeof loginSchema>;
