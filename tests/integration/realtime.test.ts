import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma";
import { setEmitter } from "../../src/realtime/hub";
import { initRealtime } from "../../src/realtime/socket";
import { api, app, bearer, futureIso, loginStaff, registerMother } from "../helpers/api";
import { createStaffUser, hasTestDb, resetDb } from "../helpers/db";

describe.skipIf(!hasTestDb)("התראות בזמן אמת", () => {
  let server: HttpServer;
  let url: string;
  let io: ReturnType<typeof initRealtime>;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    server = createServer(app);
    io = initRealtime(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(resetDb);
  afterEach(() => {
    while (sockets.length > 0) {
      sockets.pop()?.close();
    }
  });
  afterAll(async () => {
    setEmitter(null);
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await prisma.$disconnect();
  });

  const open = (token: string): Socket => {
    const socket = connect(url, { auth: { token }, transports: ["websocket"], reconnection: false });
    sockets.push(socket);
    return socket;
  };
  const once = <T>(socket: Socket, event: string): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`לא התקבל האירוע ${event}`)), 5000);
      socket.once(event, (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

  it("חיבור בלי Token או עם Token מזויף נדחה", async () => {
    for (const auth of [{}, { token: "fake" }]) {
      const socket = connect(url, { auth, transports: ["websocket"], reconnection: false });
      sockets.push(socket);
      const error = await new Promise<Error>((resolve) => socket.once("connect_error", resolve));
      expect(error.message).toBe("UNAUTHORIZED");
    }
  });

  it("אמא מחוברת מקבלת התראה מיד כשאיש צוות קובע לה פגישה", async () => {
    const mother = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();
    const socket = open(mother.token);
    await once(socket, "connect");

    const incoming = once<{ type: string; link: string }>(socket, "notification:new");
    await api()
      .post("/api/schedule")
      .set(bearer(staff.token))
      .send({ ownerId: mother.id, category: "APPOINTMENT", type: "STAFF_MEETING", title: "פגישה", startAt: futureIso(2) });
    const notification = await incoming;
    expect(notification.type).toBe("APPOINTMENT_CREATED_BY_STAFF");
    expect(notification.link).toContain("/schedule");
  });

  it("הודעה חדשה מגיעה בזמן אמת, וההתראה מתעדכנת (מונה) בהודעה הבאה", async () => {
    const mother = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();
    const conversation = await api().post("/api/conversations/direct").set(bearer(staff.token)).send({ userId: mother.id });
    const conversationId = conversation.body.conversation.id as number;

    const socket = open(mother.token);
    await once(socket, "connect");
    const firstMessage = once<{ content: string }>(socket, "message:new");
    const firstNotification = once<{ count: number }>(socket, "notification:new");
    await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(staff.token)).send({ content: "שלום" });
    expect((await firstMessage).content).toBe("שלום");
    expect((await firstNotification).count).toBe(1);

    const updated = once<{ count: number }>(socket, "notification:updated");
    await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(staff.token)).send({ content: "עוד אחת" });
    expect((await updated).count).toBe(2);
  });

  it("התראות שלא נקראו מגיעות כחלון קופץ (backlog) אחרי ההתחברות", async () => {
    const mother = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();
    // האמא לא מחוברת בזמן שהפגישה נקבעת
    await api()
      .post("/api/schedule")
      .set(bearer(staff.token))
      .send({ ownerId: mother.id, category: "APPOINTMENT", type: "STAFF_MEETING", title: "פגישה", startAt: futureIso(2) });

    const socket = open(mother.token);
    const backlog = await once<{ notifications: { isRead: boolean }[] }>(socket, "notification:backlog");
    expect(backlog.notifications).toHaveLength(1);
    expect(backlog.notifications[0]?.isRead).toBe(false);
  });

  it("אין backlog כשאין התראות שלא נקראו", async () => {
    const mother = await registerMother();
    const socket = open(mother.token);
    await once(socket, "connect");
    let received = false;
    socket.on("notification:backlog", () => {
      received = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(received).toBe(false);
  });
});
