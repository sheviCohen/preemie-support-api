// נקודת חיבור בין הלוגיקה של השרת לבין Socket.IO.
// הלוגיקה קוראת ל-emitToUser בלי להכיר את Socket.IO, ולכן קל לבדוק אותה.

type Emitter = (userId: number, event: string, payload: unknown) => void;

let emitter: Emitter | null = null;

export function setEmitter(next: Emitter | null): void {
  emitter = next;
}

export function userRoom(userId: number): string {
  return `user:${userId}`;
}

/** שולח אירוע בזמן אמת למשתמש/ת, אם מחוברים. אם לא, האירוע פשוט לא נשלח (ההתראה כבר שמורה). */
export function emitToUser(userId: number, event: string, payload: unknown): void {
  if (!emitter) {
    return;
  }
  try {
    emitter(userId, event, payload);
  } catch (error) {
    console.error("שליחת אירוע בזמן אמת נכשלה", error);
  }
}

export const REALTIME_EVENTS = {
  notificationNew: "notification:new",
  notificationUpdated: "notification:updated",
  notificationBacklog: "notification:backlog",
  messageNew: "message:new",
} as const;
