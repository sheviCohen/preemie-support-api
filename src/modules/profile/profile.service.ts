import { prisma, isUniqueViolation } from "../../db/prisma";
import { conflict } from "../../utils/httpError";
import { toSelfDto } from "../users/user.serializers";
import type { Role } from "../../domain/constants";
import type { UpdateProfileInput } from "./profile.schemas";

/** עריכת פרופיל. שדה שלא נשלח לא משתנה. פרטי התינוק מתעדכנים רק אצל אמא, כי לאיש צוות אין תינוק. */
export async function updateProfile(userId: number, role: Role, input: UpdateProfileInput) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        email: input.email,
        city: input.city,
        ...(input.baby && role === "MOTHER"
          ? {
              baby: {
                update: {
                  name: input.baby.name,
                  birthDate: input.baby.birthDate,
                  gestationalWeek: input.baby.gestationalWeek,
                  birthWeightGrams: input.baby.birthWeightGrams,
                  notes: input.baby.notes,
                },
              },
            }
          : {}),
      },
      include: { baby: true },
    });
    return toSelfDto(user, user.baby);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict("EMAIL_TAKEN", "כתובת האימייל כבר רשומה במערכת");
    }
    throw error;
  }
}

export async function setAvatar(userId: number, image: string): Promise<string> {
  await prisma.user.update({ where: { id: userId }, data: { avatarData: image } });
  return image;
}

export async function removeAvatar(userId: number): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { avatarData: null } });
}
