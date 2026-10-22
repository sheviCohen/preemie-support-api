import type { Prisma } from "@prisma/client";
import { isUniqueViolation, prisma } from "../../db/prisma";
import { emitToUser, REALTIME_EVENTS } from "../../realtime/hub";
import type { AuthUser } from "../../types/auth";
import { badRequest, notFound } from "../../utils/httpError";
import {
  markConversationNotificationsRead,
  notifyDirectMessage,
} from "../notifications/notifications.service";
import { PUBLIC_USER_SELECT, toUserSummary } from "../users/user.serializers";
import { getOrCreateGeneralConversation } from "./general";

const messageInclude = { sender: { select: PUBLIC_USER_SELECT } } satisfies Prisma.MessageInclude;
type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

export function toMessageDto(message: MessageRow) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    sender: toUserSummary(message.sender),
  };
}

/** שיחה שהמשתמש/ת חברים בה. אחרת "לא נמצא", כדי לא לחשוף שיחות של אחרים. */
async function requireMembership(user: AuthUser, conversationId: number) {
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    include: { conversation: true },
  });
  if (!membership) {
    throw notFound("השיחה לא נמצאה");
  }
  return membership;
}

/** כמה הודעות של אחרים הגיעו אחרי הקריאה האחרונה */
async function unreadCountFor(userId: number, conversationId: number, lastReadAt: Date | null): Promise<number> {
  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  });
}

async function summarize(user: AuthUser, conversationId: number) {
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      members: { include: { user: { select: PUBLIC_USER_SELECT } } },
      messages: { orderBy: { id: "desc" }, take: 1, include: messageInclude },
    },
  });
  const me = conversation.members.find((member) => member.userId === user.id);
  const other = conversation.members.find((member) => member.userId !== user.id);
  const unreadCount = await unreadCountFor(user.id, conversation.id, me?.lastReadAt ?? null);
  const last = conversation.messages[0];
  return {
    id: conversation.id,
    type: conversation.type,
    title: conversation.type === "GENERAL" ? "צ'אט כללי" : null,
    withUser: conversation.type === "DIRECT" && other ? toUserSummary(other.user) : null,
    lastMessage: last ? toMessageDto(last) : null,
    unreadCount,
    hasUnread: unreadCount > 0,
  };
}

/** כל השיחות של המשתמש/ת (שיחות פרטיות רק אחרי שנשלחה בהן הודעה). שיחה עם הודעה שלא נקראה מסומנת (hasUnread). הכי חדשות למעלה. */
export async function listConversations(user: AuthUser) {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId: user.id },
    select: { conversationId: true },
  });
  const all = await Promise.all(memberships.map((m) => summarize(user, m.conversationId)));
  // שיחה פרטית שעדיין אין בה הודעות לא מוצגת ברשימה (נפתחת ישירות לפי המזהה שחזר מפתיחתה)
  const summaries = all.filter((item) => item.type === "GENERAL" || item.lastMessage !== null);
  summaries.sort((a, b) => {
    // שיחה ללא הודעות (או הכללית ללא הודעות) יורדת למטה
    const aTime = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0;
    const bTime = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0;
    return bTime - aTime;
  });
  return {
    conversations: summaries,
    totalUnread: summaries.reduce((sum, item) => sum + item.unreadCount, 0),
  };
}

/** פותח שיחה פרטית עם משתמש/ת אחרים, או מחזיר את הקיימת. הפנייה הראשונה מחזירה 201. */
export async function openDirect(user: AuthUser, otherUserId: number) {
  if (otherUserId === user.id) {
    throw badRequest("VALIDATION_ERROR", "אי אפשר לפתוח שיחה עם עצמך");
  }
  const other = await prisma.user.findUnique({ where: { id: otherUserId }, select: { id: true } });
  if (!other) {
    throw notFound("המשתמש/ת לא נמצאו");
  }
  const directKey = `${Math.min(user.id, otherUserId)}-${Math.max(user.id, otherUserId)}`;

  const existing = await prisma.conversation.findUnique({ where: { directKey }, select: { id: true } });
  if (existing) {
    return { created: false, conversation: await summarize(user, existing.id) };
  }
  try {
    const created = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        directKey,
        members: { create: [{ userId: user.id }, { userId: otherUserId }] },
      },
      select: { id: true },
    });
    return { created: true, conversation: await summarize(user, created.id) };
  } catch (error) {
    if (isUniqueViolation(error)) {
      // שני הצדדים פתחו בו זמנית: מחזירים את מה שנוצר
      const raced = await prisma.conversation.findUniqueOrThrow({ where: { directKey }, select: { id: true } });
      return { created: false, conversation: await summarize(user, raced.id) };
    }
    throw error;
  }
}

export async function getMessages(user: AuthUser, conversationId: number, params: { beforeId?: number; limit: number }) {
  await requireMembership(user, conversationId);
  const rows = await prisma.message.findMany({
    where: { conversationId, ...(params.beforeId ? { id: { lt: params.beforeId } } : {}) },
    orderBy: { id: "desc" },
    take: params.limit,
    include: messageInclude,
  });
  // מוחזר מהישן לחדש, להצגה ישירה בחלון השיחה
  const messages = rows.reverse().map(toMessageDto);
  return { messages, hasMore: rows.length === params.limit };
}

export async function sendMessage(user: AuthUser, conversationId: number, content: string) {
  const { conversation } = await requireMembership(user, conversationId);

  const message = await prisma.message.create({
    data: { conversationId, senderId: user.id, content },
    include: messageInclude,
  });
  // מי ששולח/ת הודעה קראה/ה את השיחה עד עכשיו
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    data: { lastReadAt: message.createdAt },
  });

  const dto = toMessageDto(message);
  const members = await prisma.conversationMember.findMany({
    where: { conversationId, userId: { not: user.id } },
    select: { userId: true },
  });
  for (const member of members) {
    emitToUser(member.userId, REALTIME_EVENTS.messageNew, dto);
  }

  // התראה קופצת: בשיחות פרטיות בלבד. בצ'אט הכללי רואים את ההודעות בזמן אמת בתוך הצ'אט.
  if (conversation.type === "DIRECT") {
    const messageCount = await prisma.message.count({ where: { conversationId } });
    const senderName = `${message.sender.firstName} ${message.sender.lastName}`.trim();
    for (const member of members) {
      await notifyDirectMessage({
        recipientId: member.userId,
        conversationId,
        senderName,
        isFirstMessage: messageCount === 1,
      });
    }
  }
  return { message: dto };
}

export async function markRead(user: AuthUser, conversationId: number) {
  await requireMembership(user, conversationId);
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    data: { lastReadAt: new Date() },
  });
  await markConversationNotificationsRead(user.id, conversationId);
  return { ok: true };
}

export async function getGeneralConversationSummary(user: AuthUser) {
  const general = await getOrCreateGeneralConversation(prisma);
  return summarize(user, general.id);
}
