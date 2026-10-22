export interface NotificationRow {
  id: number;
  type: string;
  title: string;
  body: string;
  count: number;
  link: string | null;
  conversationId: number | null;
  scheduleItemId: number | null;
  isRead: boolean;
  createdAt: Date;
}

export function toNotificationDto(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    count: row.count,
    link: row.link,
    conversationId: row.conversationId,
    scheduleItemId: row.scheduleItemId,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}
