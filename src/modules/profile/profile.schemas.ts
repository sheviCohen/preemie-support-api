import { z } from "zod";
import { LIMITS } from "../../domain/constants";
import { babyShape, motherShape } from "../auth/auth.schemas";

/** עריכת פרופיל: כל שדה אופציונלי. מה שלא נשלח לא משתנה. */
export const updateProfileSchema = z.object({
  ...z.object(motherShape).partial().shape,
  baby: z.object(babyShape).partial().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** גודל התמונה בבתים אחרי פענוח base64 */
export function decodedImageBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export const avatarSchema = z.object({
  image: z
    .string({ required_error: "חובה לשלוח תמונה", invalid_type_error: "התמונה חייבת להיות טקסט" })
    .regex(
      IMAGE_DATA_URL,
      "התמונה חייבת להיות בפורמט data URL של png, jpeg או webp (data:image/png;base64,...)",
    )
    .refine((value) => decodedImageBytes(value) <= LIMITS.avatarMaxBytes, {
      message: `התמונה גדולה מדי. הגודל המרבי הוא ${LIMITS.avatarMaxBytes / 1024}KB`,
    }),
});
export type AvatarInput = z.infer<typeof avatarSchema>;
