import { prisma, isUniqueViolation } from "../../db/prisma";
import { conflict, notFound, unauthorized } from "../../utils/httpError";
import { signAccessToken } from "../../utils/jwt";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "../../utils/password";
import { joinGeneralConversation } from "../conversations/general";
import { toSelfDto } from "../users/user.serializers";
import type { LoginInput, RegisterInput } from "./auth.schemas";

/** הרשמת אמא חדשה יחד עם התינוק שלה, וצירופה לצ'אט הכללי */
export async function register(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          role: "MOTHER",
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          city: input.city || null,
          baby: {
            create: {
              name: input.baby.name,
              birthDate: input.baby.birthDate,
              gestationalWeek: input.baby.gestationalWeek,
              birthWeightGrams: input.baby.birthWeightGrams,
              notes: input.baby.notes || null,
            },
          },
        },
        include: { baby: true },
      });
      await joinGeneralConversation(tx, created.id);
      return created;
    });
    return { token: signAccessToken(user), user: toSelfDto(user, user.baby) };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict("EMAIL_TAKEN", "כתובת האימייל כבר רשומה במערכת");
    }
    throw error;
  }
}

/** התחברות. אותה הודעה גם כשהאימייל לא קיים וגם כשהסיסמה שגויה. */
export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { baby: true },
  });

  if (!user) {
    await verifyAgainstDummy(input.password);
    throw unauthorized("INVALID_CREDENTIALS", "אימייל או סיסמה שגויים");
  }
  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw unauthorized("INVALID_CREDENTIALS", "אימייל או סיסמה שגויים");
  }

  await joinGeneralConversation(prisma, user.id);
  return { token: signAccessToken(user), user: toSelfDto(user, user.baby) };
}

/** המשתמש/ת המחוברים, בלי Hash של סיסמה */
export async function getSelf(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { baby: true },
  });
  if (!user) {
    throw notFound("המשתמש/ת לא נמצאו");
  }
  return toSelfDto(user, user.baby);
}
