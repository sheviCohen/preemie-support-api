import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma";
import { api, bearer, registerMother } from "../helpers/api";
import { hasTestDb, resetDb } from "../helpers/db";

describe.skipIf(!hasTestDb)("בדיקת תקינות, תיעוד וקופות חולים", () => {
  afterAll(() => prisma.$disconnect());

  it("/health בודק גם את מסד הנתונים", async () => {
    const response = await api().get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", database: "ok" });
  });

  it("/api-docs ו-/api-docs.json זמינים בלי התחברות", async () => {
    const docs = await api().get("/api-docs.json");
    expect(docs.status).toBe(200);
    expect(docs.body.openapi).toBe("3.0.3");
    const ui = await api().get("/api-docs/");
    expect(ui.status).toBe(200);
    expect(ui.text).toContain("swagger");
  });

  it("קישורי קופות החולים דורשים התחברות", async () => {
    await resetDb();
    expect((await api().get("/api/health-funds")).status).toBe(401);
    const { token } = await registerMother();
    const response = await api().get("/api/health-funds").set(bearer(token));
    expect(response.status).toBe(200);
    expect(response.body.healthFunds).toHaveLength(4);
  });
});
