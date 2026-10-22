import { z } from "zod";

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100, "החיפוש ארוך מדי").optional(),
  limit: z.coerce
    .number({ invalid_type_error: "limit חייב להיות מספר" })
    .int()
    .min(1, "limit חייב להיות לפחות 1")
    .max(100, "limit מרבי הוא 100")
    .default(100),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
