import { prisma, type DbClient } from "../../db/prisma";
import type { NotificationType } from "../../domain/constants";
import { emitToUser, REALTIME_EVENTS } from "../../realtime/hub";
import { notFound } from "../../utils/httpError";
import { toNotificationDto } from "./notifications.dto";

export interface NewNotification {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  conversationId?: number | null;
  scheduleItemId?: number | null;
}

/** שומר התראה ושולח אותה בזמן אמת למי שמחובר/ת */
export async function createNotification(input: NewNotification, db: DbClient = prisma) {
  const row = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      conversationId: input.conversationId ?? null,
      scheduleItemId: input.scheduleItemId ?? null,
    },
  });
  emitToUser(input.userId, REALTIME_EVENTS.notificationNew, toNotificationDto(row));
  return row;
}

export function chatBody(count: number, senderName: string): string {
  return count === 1 ? `הודעה חדשה מ${senderName}` : `יש לך ${count} הודעות חדשות מ${senderName}!`;
}

/**
 * התראה על הודעה חדשה בשיחה פרטית.
 * אם כבר יש התראה שלא נקראה על אותה שיחה, מגדילים את המונה במקום ליצור עוד אחת.
 */
export async function notifyDirectMessage(params: {
  recipientId: number;
  conversationId: number;
  senderName: string;
  isFirstMessage: boolean;
}) {
  const existing = await prisma.notification.findFirst({
    where: {
      userId: params.recipientId,
      conversationId: params.conversationId,
      isRead: false,
      type: { in: ["NEW_MESSAGE", "NEW_CHAT"] },
    },
    orderBy: { id: "desc" },
  });

  if (existing) {
    const count = existing.count + 1;
    const updated = await prisma.notification.update({
      where: { id: existing.id },
      data: { count, body: chatBody(count, params.senderName) },
    });
    emitToUser(params.recipientId, REALTIME_EVENTS.notificationUpdated, toNotificationDto(updated));
    return updated;
  }

  return createNotification({
    userId: params.recipientId,
    type: params.isFirstMessage ? "NEW_CHAT" : "NEW_MESSAGE",
    title: params.isFirstMessage ? "שיחה חדשה" : "הודעה חדשה",
    body: params.isFirstMessage
      ? `${params.senderName} פתחה שיחה איתך`
      : chatBody(1, params.senderName),
    link: `/chats/${params.conversationId}`,
    conversationId: params.conversationId,
  });
}

/** כשפותחים שיחה וקוראים אותה, ההתראות שלה נחשבות כנקראות */
export async function markConversationNotificationsRead(userId: number, conversationId: number) {
  await prisma.notification.updateMany({
    where: { userId, conversationId, isRead: false },
    data: { isRead: true },
  });
}

export async function listNotifications(userId: number, params: { unreadOnly: boolean; limit: number; beforeId?: number }) {
  const rows = await prisma.notification.findMany({
    where: {
      userId,
      ...(params.unreadOnly ? { isRead: false } : {}),
      ...(params.beforeId ? { id: { lt: params.beforeId } } : {}),
    },
    orderBy: { id: "desc" },
    take: params.limit,
  });
  const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
  return { notifications: rows.map(toNotificationDto), unreadCount };
}

export async function markRead(userId: number, notificationId: number) {
  const row = await prisma.notification.findFirst({ where: { id: notificationId, userId } });
  if (!row) {
    throw notFound("ההתראה לא נמצאה");
  }
  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
  return toNotificationDto(updated);
}

export async function markAllRead(userId: number) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}

/** ההתראות שלא נקראו, לחלון הקופץ אחרי ההתחברות */
export async function getBacklog(userId: number) {
  const rows = await prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { id: "asc" },
    take: 100,
  });
  return rows.map(toNotificationDto);
}
