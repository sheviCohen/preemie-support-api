import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma";
import { api, bearer, loginStaff, registerMother } from "../helpers/api";
import { createStaffUser, hasTestDb, resetDb } from "../helpers/db";

describe.skipIf(!hasTestDb)("צ'אטים והתראות", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  async function openDirect(token: string, userId: number): Promise<number> {
    const response = await api().post("/api/conversations/direct").set(bearer(token)).send({ userId });
    expect([200, 201]).toContain(response.status);
    return response.body.conversation.id as number;
  }

  it("פתיחת שיחה פרטית היא אידמפוטנטית: אותה שיחה לשני הצדדים", async () => {
    const a = await registerMother();
    const b = await registerMother({ email: "lea@example.test", firstName: "לאה" });
    const first = await api().post("/api/conversations/direct").set(bearer(a.token)).send({ userId: b.id });
    expect(first.status).toBe(201);
    const again = await api().post("/api/conversations/direct").set(bearer(a.token)).send({ userId: b.id });
    expect(again.status).toBe(200);
    const fromB = await api().post("/api/conversations/direct").set(bearer(b.token)).send({ userId: a.id });
    expect(fromB.body.conversation.id).toBe(first.body.conversation.id);
  });

  it("שיחה פרטית ריקה לא מופיעה ברשימה עד שנשלחת בה הודעה", async () => {
    const a = await registerMother();
    const b = await registerMother({ email: "lea@example.test", firstName: "לאה" });
    const conversationId = await openDirect(a.token, b.id);
    const before = await api().get("/api/conversations").set(bearer(b.token));
    expect(before.body.conversations.some((c: { type: string }) => c.type === "DIRECT")).toBe(false);
    await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(a.token)).send({ content: "היי" });
    const after = await api().get("/api/conversations").set(bearer(b.token));
    expect(after.body.conversations.some((c: { type: string }) => c.type === "DIRECT")).toBe(true);
  });

  it("אי אפשר לפתוח שיחה עם עצמך או עם משתמש שלא קיים", async () => {
    const a = await registerMother();
    expect((await api().post("/api/conversations/direct").set(bearer(a.token)).send({ userId: a.id })).status).toBe(400);
    expect((await api().post("/api/conversations/direct").set(bearer(a.token)).send({ userId: 9999 })).status).toBe(404);
  });

  it("הודעה חדשה מסמנת שיחה כ'לא נקראה', ופתיחתה מסירה את הסימון", async () => {
    const mother = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();
    const conversationId = await openDirect(staff.token, mother.id);

    await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(staff.token)).send({ content: "שלום" });
    await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(staff.token)).send({ content: "מה שלומך?" });

    const list = await api().get("/api/conversations").set(bearer(mother.token));
    const direct = list.body.conversations.find((c: { type: string }) => c.type === "DIRECT");
    expect(direct.hasUnread).toBe(true);
    expect(direct.unreadCount).toBe(2);
    expect(list.body.totalUnread).toBe(2);

    // לשולח/ת עצמם אין "לא נקרא"
    const senderList = await api().get("/api/conversations").set(bearer(staff.token));
    expect(senderList.body.totalUnread).toBe(0);

    await api().post(`/api/conversations/${conversationId}/read`).set(bearer(mother.token));
    const after = await api().get("/api/conversations").set(bearer(mother.token));
    expect(after.body.totalUnread).toBe(0);
  });

  it("הודעות ברצף מאוחדות להתראה אחת עם מונה, ו'שיחה חדשה' להודעה הראשונה", async () => {
    const mother = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();
    const conversationId = await openDirect(staff.token, mother.id);

    for (let index = 0; index < 3; index += 1) {
      await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(staff.token)).send({ content: `הודעה ${index}` });
    }
    const response = await api().get("/api/notifications").set(bearer(mother.token));
    expect(response.body.notifications).toHaveLength(1);
    expect(response.body.notifications[0].count).toBe(3);
    expect(response.body.notifications[0].type).toBe("NEW_CHAT");
    expect(response.body.notifications[0].body).toContain("3");
    expect(response.body.notifications[0].link).toBe(`/chats/${conversationId}`);
  });

  it("אחרי קריאת ההתראה, הודעה חדשה יוצרת התראה חדשה", async () => {
    const mother = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();
    const conversationId = await openDirect(staff.token, mother.id);
    await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(staff.token)).send({ content: "א" });
    await api().post("/api/notifications/read-all").set(bearer(mother.token));
    await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(staff.token)).send({ content: "ב" });
    const response = await api().get("/api/notifications?unreadOnly=true").set(bearer(mother.token));
    expect(response.body.notifications).toHaveLength(1);
    expect(response.body.notifications[0].count).toBe(1);
    expect(response.body.notifications[0].type).toBe("NEW_MESSAGE");
  });

  it("אי אפשר לקרוא או לשלוח בשיחה פרטית של אחרים (404)", async () => {
    const a = await registerMother();
    const b = await registerMother({ email: "lea@example.test", firstName: "לאה" });
    const outsider = await registerMother({ email: "rut@example.test", firstName: "רות" });
    const conversationId = await openDirect(a.token, b.id);
    await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(a.token)).send({ content: "סוד" });

    expect((await api().get(`/api/conversations/${conversationId}/messages`).set(bearer(outsider.token))).status).toBe(404);
    expect((await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(outsider.token)).send({ content: "x" })).status).toBe(404);
    expect((await api().post(`/api/conversations/${conversationId}/read`).set(bearer(outsider.token))).status).toBe(404);
  });

  it("הצ'אט הכללי: כולם קוראים וכותבים, ואין התראות קופצות על הודעות בו", async () => {
    const a = await registerMother();
    const b = await registerMother({ email: "lea@example.test", firstName: "לאה" });
    const general = (await api().get("/api/conversations").set(bearer(a.token))).body.conversations.find(
      (c: { type: string }) => c.type === "GENERAL",
    );
    const sent = await api().post(`/api/conversations/${general.id}/messages`).set(bearer(a.token)).send({ content: "שלום לכולן" });
    expect(sent.status).toBe(201);
    const read = await api().get(`/api/conversations/${general.id}/messages`).set(bearer(b.token));
    expect(read.body.messages).toHaveLength(1);
    expect((await api().get("/api/notifications").set(bearer(b.token))).body.notifications).toHaveLength(0);
  });

  it("הודעות מחולקות לעמודים (beforeId, limit)", async () => {
    const a = await registerMother();
    const b = await registerMother({ email: "lea@example.test", firstName: "לאה" });
    const conversationId = await openDirect(a.token, b.id);
    for (let index = 1; index <= 5; index += 1) {
      await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(a.token)).send({ content: `m${index}` });
    }
    const page = await api().get(`/api/conversations/${conversationId}/messages?limit=2`).set(bearer(a.token));
    expect(page.body.messages.map((m: { content: string }) => m.content)).toEqual(["m4", "m5"]);
    expect(page.body.hasMore).toBe(true);
    const older = await api()
      .get(`/api/conversations/${conversationId}/messages?limit=2&beforeId=${page.body.messages[0].id}`)
      .set(bearer(a.token));
    expect(older.body.messages.map((m: { content: string }) => m.content)).toEqual(["m2", "m3"]);
  });

  it("הודעה ריקה נדחית, וקריאת התראה של אחרת מחזירה 404", async () => {
    const a = await registerMother();
    const b = await registerMother({ email: "lea@example.test", firstName: "לאה" });
    const conversationId = await openDirect(a.token, b.id);
    expect((await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(a.token)).send({ content: " " })).status).toBe(400);
    await api().post(`/api/conversations/${conversationId}/messages`).set(bearer(a.token)).send({ content: "היי" });
    const notification = (await api().get("/api/notifications").set(bearer(b.token))).body.notifications[0];
    expect((await api().post(`/api/notifications/${notification.id}/read`).set(bearer(a.token))).status).toBe(404);
    expect((await api().post(`/api/notifications/${notification.id}/read`).set(bearer(b.token))).status).toBe(200);
  });
});
