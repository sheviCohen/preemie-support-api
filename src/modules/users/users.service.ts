import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import type { Role } from "../../domain/constants";
import { notFound } from "../../utils/httpError";
import type { ListUsersQuery } from "./users.schemas";
import {
  PUBLIC_USER_SELECT,
  toMotherListItem,
  toSelfDto,
  toStaffListItem,
} from "./user.serializers";

/** חיפוש לפי שם: כל מילה בחיפוש חייבת להופיע בשם הפרטי או בשם המשפחה */
function nameSearchFilter(search: string | undefined): Prisma.UserWhereInput[] {
  if (!search) {
    return [];
  }
  const words = search.split(/\s+/).filter((word) => word.length > 0).slice(0, 3);
  return words.map((word) => ({
    OR: [
      { firstName: { contains: word, mode: "insensitive" as const } },
      { lastName: { contains: word, mode: "insensitive" as const } },
    ],
  }));
}

async function listByRole(currentUserId: number, role: Role, query: ListUsersQuery) {
  return prisma.user.findMany({
    where: {
      role,
      id: { not: currentUserId },
      AND: nameSearchFilter(query.search),
    },
    select: PUBLIC_USER_SELECT,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: query.limit,
  });
}

/** רשימת האמהות הרשומות (בלי המשתמשת עצמה). שם, תמונה ועיר בלבד. */
export async function listMothers(currentUserId: number, query: ListUsersQuery) {
  const mothers = await listByRole(currentUserId, "MOTHER", query);
  return { mothers: mothers.map(toMotherListItem) };
}

/** רשימת אנשי הצוות (בלי המשתמש/ת עצמם) */
export async function listStaff(currentUserId: number, query: ListUsersQuery) {
  const staff = await listByRole(currentUserId, "STAFF", query);
  return { staff: staff.map(toStaffListItem) };
}

/** פרופיל מלא של אמא ותינוק, לצפייה בלבד של איש צוות */
export async function getMotherFullProfile(motherId: number) {
  const mother = await prisma.user.findFirst({
    where: { id: motherId, role: "MOTHER" },
    include: { baby: true },
  });
  if (!mother) {
    throw notFound("האמא לא נמצאה");
  }
  return { user: toSelfDto(mother, mother.baby) };
}
