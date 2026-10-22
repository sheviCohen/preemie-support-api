import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma";
import { api, bearer, babyInput, registerMother } from "../helpers/api";
import { hasTestDb, resetDb } from "../helpers/db";

describe.skipIf(!hasTestDb)("הרשמה והתחברות", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("הרשמה יוצרת אמא ותינוק, מחזירה Token, ולא חושפת סיסמה", async () => {
    const response = await api().post("/api/auth/register").send({
      firstName: "שרה",
      lastName: "כהן",
      phone: "0501234567",
      email: "Sara@Example.test",
      password: "Password123",
      baby: babyInput,
    });
    expect(response.status).toBe(201);
    expect(typeof response.body.token).toBe("string");
    expect(response.body.user.email).toBe("sara@example.test");
    expect(response.body.user.role).toBe("MOTHER");
    expect(response.body.user.baby.name).toBe("נועם");
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(JSON.stringify(response.body)).not.toContain("Password123");
  });

  it("הסיסמה נשמרת כ-Hash ולא כטקסט", async () => {
    await registerMother();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "sara@example.test" } });
    expect(user.passwordHash).not.toBe("Password123");
    expect(user.passwordHash.startsWith("$2")).toBe(true);
  });

  it("הרשמה צורפת לצ'אט הכללי", async () => {
    const { token } = await registerMother();
    const response = await api().get("/api/conversations").set(bearer(token));
    expect(response.status).toBe(200);
    expect(response.body.conversations.some((c: { type: string }) => c.type === "GENERAL")).toBe(true);
  });

  it("אימייל כפול מחזיר 409", async () => {
    await registerMother();
    const response = await api().post("/api/auth/register").send({
      firstName: "עוד",
      lastName: "אחת",
      phone: "0509999999",
      email: "sara@example.test",
      password: "Password123",
      baby: babyInput,
    });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("נתונים לא תקינים מחזירים 400 עם הודעה בעברית", async () => {
    const response = await api().post("/api/auth/register").send({ email: "x" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(typeof response.body.error.message).toBe("string");
  });

  it("התחברות תקינה מחזירה Token, וסיסמה שגויה מחזירה 401", async () => {
    await registerMother();
    const ok = await api().post("/api/auth/login").send({ email: "sara@example.test", password: "Password123" });
    expect(ok.status).toBe(200);
    expect(typeof ok.body.token).toBe("string");

    const wrong = await api().post("/api/auth/login").send({ email: "sara@example.test", password: "WrongPass999" });
    expect(wrong.status).toBe(401);
    const unknown = await api().post("/api/auth/login").send({ email: "nobody@example.test", password: "Password123" });
    expect(unknown.status).toBe(401);
    // אותה הודעה בשני המקרים: לא חושפים אם האימייל קיים
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  it("נתיב מוגן בלי Token או עם Token מזויף מחזיר 401", async () => {
    expect((await api().get("/api/auth/me")).status).toBe(401);
    expect((await api().get("/api/auth/me").set(bearer("not-a-real-token"))).status).toBe(401);
  });

  it("/api/auth/me מחזיר את המשתמשת המחוברת", async () => {
    const { token } = await registerMother();
    const response = await api().get("/api/auth/me").set(bearer(token));
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("sara@example.test");
  });

  it("נתיב שלא קיים מחזיר 404 במבנה שגיאה אחיד", async () => {
    const response = await api().get("/api/nope");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
