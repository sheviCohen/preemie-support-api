import type { DbClient } from "../../db/prisma";

// הצ'אט הכללי: שיחה אחת שכל המשתמשים והמשתמשות חברים בה.

export async function getOrCreateGeneralConversation(db: DbClient): Promise<{ id: number }> {
  const existing = await db.conversation.findFirst({
    where: { type: "GENERAL" },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (existing) {
    return existing;
  }
  return db.conversation.create({ data: { type: "GENERAL" }, select: { id: true } });
}

/** מצרף משתמש/ת לצ'אט הכללי. הודעות ישנות נחשבות כנקראות, כדי שלא ייספרו כהודעות חדשות. */
export async function joinGeneralConversation(db: DbClient, userId: number): Promise<number> {
  const general = await getOrCreateGeneralConversation(db);
  await db.conversationMember.upsert({
    where: { conversationId_userId: { conversationId: general.id, userId } },
    create: { conversationId: general.id, userId, lastReadAt: new Date() },
    update: {},
  });
  return general.id;
}
