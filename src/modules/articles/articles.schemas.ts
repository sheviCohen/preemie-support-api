import { z } from "zod";
import { ARTICLE_CATEGORIES, LIMITS } from "../../domain/constants";
import { requiredText } from "../../utils/zodHelpers";

const categorySchema = z.enum(ARTICLE_CATEGORIES, {
  errorMap: () => ({ message: "קטגוריית מאמר לא תקינה" }),
});

const sourceUrlSchema = z
  .string({ required_error: "קישור למקור הוא שדה חובה", invalid_type_error: "הקישור חייב להיות טקסט" })
  .trim()
  .max(2000, "הקישור ארוך מדי")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "הקישור חייב להיות כתובת תקינה שמתחילה ב-http או https");

const summarySchema = requiredText("תקציר", LIMITS.articleSummaryMaxLength);
const titleSchema = requiredText("כותרת", 200);

/** מאמר חיצוני: כרטיס עם מקור וקישור. מאמר צוות: טקסט מלא. מדויק אחד משניים. */
export const createArticleSchema = z
  .object({
    title: titleSchema,
    summary: summarySchema,
    category: categorySchema,
    sourceName: requiredText("שם המקור", 120).optional(),
    sourceUrl: sourceUrlSchema.optional(),
    body: requiredText("תוכן המאמר", LIMITS.articleBodyMaxLength).optional(),
  })
  .superRefine((value, ctx) => {
    const external = value.sourceName !== undefined || value.sourceUrl !== undefined;
    const written = value.body !== undefined;
    if (external && written) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "מאמר הוא או חיצוני (מקור וקישור) או מאמר צוות (תוכן), לא שניהם",
      });
      return;
    }
    if (!external && !written) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "חובה לשלוח תוכן (body), או מקור וקישור (sourceName ו-sourceUrl)",
      });
      return;
    }
    if (external && (value.sourceName === undefined || value.sourceUrl === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceUrl"],
        message: "במאמר חיצוני חובה לשלוח גם שם מקור וגם קישור",
      });
    }
  });
export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = z
  .object({
    title: titleSchema.optional(),
    summary: summarySchema.optional(),
    category: categorySchema.optional(),
    sourceName: requiredText("שם המקור", 120).optional(),
    sourceUrl: sourceUrlSchema.optional(),
    body: requiredText("תוכן המאמר", LIMITS.articleBodyMaxLength).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "לא נשלח אף שדה לעדכון",
  });
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

export const listArticlesQuerySchema = z.object({
  search: z.string().trim().max(100, "החיפוש ארוך מדי").optional(),
  category: categorySchema.optional(),
  kind: z.enum(["external", "staff"], { errorMap: () => ({ message: "kind חייב להיות external או staff" }) }).optional(),
  limit: z.coerce.number().int().min(1).max(100, "limit מרבי 100").default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;
