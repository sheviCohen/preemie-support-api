import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma";
import { api, bearer, loginStaff, registerMother } from "../helpers/api";
import { createStaffUser, hasTestDb, resetDb } from "../helpers/db";

describe.skipIf(!hasTestDb)("פרופיל ורשימות משתמשים", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("אמא עורכת את הפרופיל שלה והתינוק, ושדה שלא נשלח לא משתנה", async () => {
    const { token } = await registerMother();
    const response = await api()
      .put("/api/profile")
      .set(bearer(token))
      .send({ city: "חיפה", baby: { notes: "שוקל יותר" } });
    expect(response.status).toBe(200);
    expect(response.body.user.city).toBe("חיפה");
    expect(response.body.user.firstName).toBe("שרה");
    expect(response.body.user.baby.notes).toBe("שוקל יותר");
    expect(response.body.user.baby.name).toBe("נועם");
  });

  it("שבוע לידה לא תקין בעריכה מחזיר 400", async () => {
    const { token } = await registerMother();
    const response = await api().put("/api/profile").set(bearer(token)).send({ baby: { gestationalWeek: 45 } });
    expect(response.status).toBe(400);
  });

  it("איש צוות לא ניגש לפרופיל האמהות המשותף (403), אבל רואה פרופיל של אמא", async () => {
    const { id } = await registerMother();
    await createStaffUser();
    const staff = await loginStaff();
    expect((await api().get("/api/profile").set(bearer(staff.token))).status).toBe(403);
    const view = await api().get(`/api/mothers/${id}/profile`).set(bearer(staff.token));
    expect(view.status).toBe(200);
    expect(view.body.user.baby.name).toBe("נועם");
  });

  it("אמא לא יכולה לצפות בפרופיל מלא של אמא אחרת (403)", async () => {
    const first = await registerMother();
    const second = await registerMother({ email: "lea@example.test", firstName: "לאה" });
    const response = await api().get(`/api/mothers/${first.id}/profile`).set(bearer(second.token));
    expect(response.status).toBe(403);
  });

  it("רשימת האמהות לא כוללת טלפון, אימייל או פרטי תינוק, ולא את המשתמשת עצמה", async () => {
    const first = await registerMother();
    await registerMother({ email: "lea@example.test", firstName: "לאה" });
    const response = await api().get("/api/mothers").set(bearer(first.token));
    expect(response.status).toBe(200);
    expect(response.body.mothers).toHaveLength(1);
    const text = JSON.stringify(response.body);
    expect(text).not.toContain("0501234567");
    expect(text).not.toContain("example.test");
    expect(text).not.toContain("baby");
  });

  it("חיפוש לפי שם", async () => {
    const first = await registerMother();
    await registerMother({ email: "lea@example.test", firstName: "לאה" });
    await registerMother({ email: "rut@example.test", firstName: "רות" });
    const response = await api().get("/api/mothers?search=לא").set(bearer(first.token));
    expect(response.status).toBe(200);
    expect(response.body.mothers).toHaveLength(1);
    expect(response.body.mothers[0].firstName).toBe("לאה");
  });

  it("רשימת אנשי הצוות", async () => {
    const { token } = await registerMother();
    await createStaffUser();
    const response = await api().get("/api/staff").set(bearer(token));
    expect(response.status).toBe(200);
    expect(response.body.staff[0].staffRole).toBe("NURSE");
  });

  it("תמונת פרופיל: העלאה, וגם דחיית קובץ שאינו תמונה", async () => {
    const { token } = await registerMother();
    const ok = await api().put("/api/profile/avatar").set(bearer(token)).send({ image: "data:image/png;base64,iVBORw0KGgo=" });
    expect(ok.status).toBe(200);
    const bad = await api().put("/api/profile/avatar").set(bearer(token)).send({ image: "hello" });
    expect(bad.status).toBe(400);
    expect((await api().delete("/api/profile/avatar").set(bearer(token))).status).toBe(204);
  });
});
