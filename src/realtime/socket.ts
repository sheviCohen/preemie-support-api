import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { corsOrigins, env } from "../config/env";
import { prisma } from "../db/prisma";
import { getBacklog } from "../modules/notifications/notifications.service";
import { verifyAccessToken } from "../utils/jwt";
import { REALTIME_EVENTS, setEmitter, userRoom } from "./hub";

/**
 * חיבור בזמן אמת (Socket.IO). ה-Token נשלח ב-auth של ההתחברות: io(url, { auth: { token } }).
 * אחרי החיבור, כל ההתראות שלא נקראו נשלחות באירוע notification:backlog (אחרי השהיה קצרה).
 */
export function initRealtime(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins.includes("*") ? true : corsOrigins,
      credentials: false,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== "string" || token.length === 0) {
        next(new Error("UNAUTHORIZED"));
        return;
      }
      const { userId } = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) {
        next(new Error("UNAUTHORIZED"));
        return;
      }
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as number;
    void socket.join(userRoom(userId));

    setTimeout(() => {
      if (!socket.connected) {
        return;
      }
      getBacklog(userId)
        .then((notifications) => {
          if (notifications.length > 0 && socket.connected) {
            socket.emit(REALTIME_EVENTS.notificationBacklog, { notifications });
          }
        })
        .catch((error: unknown) => console.error("שליחת התראות שלא נקראו נכשלה", error));
    }, env.NOTIFICATION_BACKLOG_DELAY_MS);
  });

  setEmitter((userId, event, payload) => {
    io.to(userRoom(userId)).emit(event, payload);
  });

  return io;
}
