import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma";
import { api, bearer, loginStaff, registerMother } from "../helpers/api";
import { createStaffUser, hasTestDb, resetDb } from "../helpers/db";

const external = {
  title: "מאמר חיצוני",
  summary: "תקציר",
  category: "FEEDING",
  sourceName: "אתר לדוגמה",
  sourceUrl: "https://example.com/a",
};
const written = { title: "מאמר שלנו", summary: "תקציר", category: "SLEEP", body: "טקסט מלא" };

describe.skipIf(!hasTestDb)("מאמרים", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("אמא לא יכולה ליצור, לערוך או למחוק מאמר (403), אבל קוראת", async () => {
    const mother = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();
    const created = await api().post("/api/articles").set(bearer(staff.token)).send(external);
    expect(created.status).toBe(201);
    const id = created.body.article.id as number;

    expect((await api().post("/api/articles").set(bearer(mother.token)).send(external)).status).toBe(403);
    expect((await api().put(`/api/articles/${id}`).set(bearer(mother.token)).send({ title: "x" })).status).toBe(403);
    expect((await api().delete(`/api/articles/${id}`).set(bearer(mother.token))).status).toBe(403);
    expect((await api().get(`/api/articles/${id}`).set(bearer(mother.token))).status).toBe(200);
  });

  it("איש צוות עורך ומוחק רק מאמר שהוא הוסיף", async () => {
    await createStaffUser();
    await createStaffUser({ email: "social@example.test", staffRole: "SOCIAL_WORKER", firstName: "מירב" });
    const author = await loginStaff();
    const other = await api().post("/api/auth/login").send({ email: "social@example.test", password: "StaffPass123" });
    const otherToken = other.body.token as string;

    const created = await api().post("/api/articles").set(bearer(author.token)).send(written);
    const id = created.body.article.id as number;
    expect(created.body.article.kind).toBe("staff");
    expect(created.body.article.canEdit).toBe(true);

    expect((await api().put(`/api/articles/${id}`).set(bearer(otherToken)).send({ title: "חטיפה" })).status).toBe(403);
    expect((await api().delete(`/api/articles/${id}`).set(bearer(otherToken))).status).toBe(403);

    const edited = await api().put(`/api/articles/${id}`).set(bearer(author.token)).send({ title: "עודכן" });
    expect(edited.status).toBe(200);
    expect(edited.body.article.title).toBe("עודכן");
    expect((await api().delete(`/api/articles/${id}`).set(bearer(author.token))).status).toBe(204);
    expect((await api().get(`/api/articles/${id}`).set(bearer(author.token))).status).toBe(404);
  });

  it("ולידציה: מאמר חייב להיות חיצוני או מאמר צוות, וסוגו לא משתנה", async () => {
    await createStaffUser();
    const staff = await loginStaff();
    expect((await api().post("/api/articles").set(bearer(staff.token)).send({ title: "a", summary: "b", category: "FEEDING" })).status).toBe(400);
    expect((await api().post("/api/articles").set(bearer(staff.token)).send({ ...written, ...external })).status).toBe(400);
    expect((await api().post("/api/articles").set(bearer(staff.token)).send({ ...external, sourceUrl: "javascript:alert(1)" })).status).toBe(400);

    const created = await api().post("/api/articles").set(bearer(staff.token)).send(external);
    const id = created.body.article.id as number;
    expect((await api().put(`/api/articles/${id}`).set(bearer(staff.token)).send({ body: "טקסט" })).status).toBe(400);
  });

  it("רשימה עם חיפוש, סינון לפי קטגוריה וסוג, ובלי טקסט מלא", async () => {
    const mother = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();
    await api().post("/api/articles").set(bearer(staff.token)).send(external);
    await api().post("/api/articles").set(bearer(staff.token)).send(written);

    const all = await api().get("/api/articles").set(bearer(mother.token));
    expect(all.body.total).toBe(2);
    expect(JSON.stringify(all.body)).not.toContain("טקסט מלא");

    expect((await api().get("/api/articles?category=SLEEP").set(bearer(mother.token))).body.articles).toHaveLength(1);
    expect((await api().get("/api/articles?kind=external").set(bearer(mother.token))).body.articles[0].title).toBe("מאמר חיצוני");
    expect((await api().get("/api/articles?search=שלנו").set(bearer(mother.token))).body.articles).toHaveLength(1);
    expect((await api().get("/api/articles?category=BAD").set(bearer(mother.token))).status).toBe(400);
  });
});
