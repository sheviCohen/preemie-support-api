import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma";
import { api, bearer, futureIso, loginStaff, registerMother } from "../helpers/api";
import { createStaffUser, hasTestDb, resetDb } from "../helpers/db";

const clinic = (extra: Record<string, unknown> = {}) => ({
  category: "APPOINTMENT",
  type: "WELL_BABY_CLINIC",
  title: "טיפת חלב",
  startAt: futureIso(10),
  ...extra,
});

describe.skipIf(!hasTestDb)("לוח זמנים", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("אמא יוצרת תור עם גורם שאינו רשום (withWhom) ורואה אותו ברשימה", async () => {
    const { token } = await registerMother();
    const created = await api().post("/api/schedule").set(bearer(token)).send(clinic({ withWhom: "ד\"ר לוי" }));
    expect(created.status).toBe(201);
    expect(created.body.items).toHaveLength(1);
    expect(created.body.items[0].withWhom).toBe("ד\"ר לוי");
    expect(created.body.items[0].canEdit).toBe(true);

    const list = await api().get("/api/schedule").set(bearer(token));
    expect(list.body.items).toHaveLength(1);
  });

  it("סוג שלא מתאים לקטגוריה מחזיר 400", async () => {
    const { token } = await registerMother();
    const response = await api().post("/api/schedule").set(bearer(token)).send(clinic({ type: "MEDICATION" }));
    expect(response.status).toBe(400);
  });

  it("פריט חוזר נוצר כפריטים נפרדים עם seriesId משותף", async () => {
    const { token } = await registerMother();
    const response = await api()
      .post("/api/schedule")
      .set(bearer(token))
      .send({
        category: "CARE_TASK",
        type: "VITAMINS",
        title: "ויטמין D",
        startAt: futureIso(1, 7),
        recurrence: { every: 1, unit: "DAY", count: 5 },
      });
    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(5);
    expect(typeof response.body.seriesId).toBe("string");
    const seriesIds = new Set(response.body.items.map((item: { seriesId: string }) => item.seriesId));
    expect(seriesIds.size).toBe(1);
    const ids = new Set(response.body.items.map((item: { id: number }) => item.id));
    expect(ids.size).toBe(5);
  });

  it("סדרה גדולה מדי נדחית", async () => {
    const { token } = await registerMother();
    const response = await api()
      .post("/api/schedule")
      .set(bearer(token))
      .send({
        category: "CARE_TASK",
        type: "VITAMINS",
        title: "ויטמין D",
        startAt: futureIso(1),
        recurrence: { every: 1, unit: "DAY", until: futureIso(800) },
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("TOO_MANY_OCCURRENCES");
  });

  it("עריכה ומחיקה: single משפיע על פריט אחד, series על כל הסדרה", async () => {
    const { token } = await registerMother();
    const created = await api()
      .post("/api/schedule")
      .set(bearer(token))
      .send({
        category: "CARE_TASK",
        type: "INHALATION",
        title: "אינהלציה",
        startAt: futureIso(1),
        recurrence: { every: 1, unit: "DAY", count: 4 },
      });
    const first = created.body.items[0].id as number;

    const single = await api().put(`/api/schedule/${first}`).set(bearer(token)).send({ title: "רק אחד" });
    expect(single.status).toBe(200);
    expect(single.body.items).toHaveLength(1);

    const series = await api().put(`/api/schedule/${first}`).set(bearer(token)).send({ notes: "לכולם", scope: "series" });
    expect(series.body.items).toHaveLength(4);
    expect(series.body.items.every((item: { notes: string }) => item.notes === "לכולם")).toBe(true);

    const removeOne = await api().delete(`/api/schedule/${first}`).set(bearer(token));
    expect(removeOne.body.deleted).toBe(1);
    const second = created.body.items[1].id as number;
    const removeSeries = await api().delete(`/api/schedule/${second}?scope=series`).set(bearer(token));
    expect(removeSeries.body.deleted).toBe(3);
    const list = await api().get("/api/schedule").set(bearer(token));
    expect(list.body.items).toHaveLength(0);
  });

  it("אמא אחרת לא רואה ולא משנה פריט של אמא (404)", async () => {
    const owner = await registerMother();
    const other = await registerMother({ email: "lea@example.test", firstName: "לאה" });
    const created = await api().post("/api/schedule").set(bearer(owner.token)).send(clinic());
    const id = created.body.items[0].id as number;

    expect((await api().get(`/api/schedule/${id}`).set(bearer(other.token))).status).toBe(404);
    expect((await api().put(`/api/schedule/${id}`).set(bearer(other.token)).send({ title: "x" })).status).toBe(404);
    expect((await api().delete(`/api/schedule/${id}`).set(bearer(other.token))).status).toBe(404);
    expect((await api().get("/api/schedule").set(bearer(other.token))).body.items).toHaveLength(0);
  });

  it("אמא לא יכולה ליצור פריט ללוח של אמא אחרת (403)", async () => {
    const owner = await registerMother();
    const other = await registerMother({ email: "lea@example.test", firstName: "לאה" });
    const response = await api().post("/api/schedule").set(bearer(other.token)).send(clinic({ ownerId: owner.id }));
    expect(response.status).toBe(403);
  });

  it("איש צוות קובע פגישה לאמא: האמא מקבלת התראה עם קישור, ולא יכולה לערוך אותה", async () => {
    const mother = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();

    const created = await api()
      .post("/api/schedule")
      .set(bearer(staff.token))
      .send({ ownerId: mother.id, category: "APPOINTMENT", type: "STAFF_MEETING", title: "פגישה", startAt: futureIso(3) });
    expect(created.status).toBe(201);
    const id = created.body.items[0].id as number;

    const notifications = await api().get("/api/notifications").set(bearer(mother.token));
    expect(notifications.body.unreadCount).toBe(1);
    expect(notifications.body.notifications[0].type).toBe("APPOINTMENT_CREATED_BY_STAFF");
    expect(notifications.body.notifications[0].link).toContain("/schedule");

    const motherView = await api().get(`/api/schedule/${id}`).set(bearer(mother.token));
    expect(motherView.status).toBe(200);
    expect(motherView.body.item.canEdit).toBe(false);
    expect((await api().put(`/api/schedule/${id}`).set(bearer(mother.token)).send({ title: "x" })).status).toBe(403);
    expect((await api().delete(`/api/schedule/${id}`).set(bearer(mother.token))).status).toBe(403);

    expect((await api().get("/api/schedule").set(bearer(staff.token))).body.items).toHaveLength(1);
  });

  it("איש צוות מוגבל לצ'אט מתוזמן ופגישה, וחייב לבחור אמא קיימת", async () => {
    const mother = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();
    const wrongType = await api().post("/api/schedule").set(bearer(staff.token)).send(clinic({ ownerId: mother.id }));
    expect(wrongType.status).toBe(400);
    const noOwner = await api()
      .post("/api/schedule")
      .set(bearer(staff.token))
      .send({ category: "APPOINTMENT", type: "STAFF_MEETING", title: "פגישה", startAt: futureIso(3) });
    expect(noOwner.status).toBe(400);
    const missing = await api()
      .post("/api/schedule")
      .set(bearer(staff.token))
      .send({ ownerId: 9999, category: "APPOINTMENT", type: "STAFF_MEETING", title: "פגישה", startAt: futureIso(3) });
    expect(missing.status).toBe(404);
  });

  it("שינוי מועד מוחק תזכורת ישנה", async () => {
    const { token, id: userId } = await registerMother();
    const created = await api().post("/api/schedule").set(bearer(token)).send(clinic());
    const itemId = created.body.items[0].id as number;
    await prisma.notification.create({
      data: { userId, type: "APPOINTMENT_REMINDER", title: "t", body: "b", scheduleItemId: itemId },
    });
    await api().put(`/api/schedule/${itemId}`).set(bearer(token)).send({ startAt: futureIso(11) });
    expect(await prisma.notification.count({ where: { scheduleItemId: itemId } })).toBe(0);
  });

  it("סינון לפי טווח תאריכים וקטגוריה", async () => {
    const { token } = await registerMother();
    await api().post("/api/schedule").set(bearer(token)).send(clinic({ startAt: futureIso(5) }));
    await api().post("/api/schedule").set(bearer(token)).send(clinic({ startAt: futureIso(20) }));
    const range = await api()
      .get("/api/schedule")
      .query({ from: futureIso(15), to: futureIso(25) })
      .set(bearer(token));
    expect(range.body.items).toHaveLength(1);
    const care = await api().get("/api/schedule?category=CARE_TASK").set(bearer(token));
    expect(care.body.items).toHaveLength(0);
  });
});
