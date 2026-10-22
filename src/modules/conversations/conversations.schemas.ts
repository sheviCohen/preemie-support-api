import { z } from "zod";
import { LIMITS } from "../../domain/constants";

export const openDirectSchema = z.object({
  userId: z
    .number({ required_error: "חובה לציין עם מי לפתוח שיחה (userId)", invalid_type_error: "userId חייב להיות מספר" })
    .int("userId חייב להיות מספר שלם")
    .positive("userId חייב להיות חיובי"),
});

export const sendMessageSchema = z.object({
  content: z
    .string({ required_error: "תוכן ההודעה הוא שדה חובה", invalid_type_error: "תוכן ההודעה חייב להיות טקסט" })
    .trim()
    .min(1, "ההודעה לא יכולה להיות ריקה")
    .max(LIMITS.messageMaxLength, `ההודעה ארוכה מדי (עד ${LIMITS.messageMaxLength} תווים)`),
});

export const messagesQuerySchema = z.object({
  beforeId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1, "limit מינימלי 1").max(100, "limit מרבי 100").default(50),
});
