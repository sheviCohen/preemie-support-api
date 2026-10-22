import request from "supertest";
import { createApp } from "../../src/app";

export const app = createApp();
export const api = () => request(app);

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export const babyInput = {
  name: "נועם",
  birthDate: "2026-09-01",
  gestationalWeek: 31,
  birthWeightGrams: 1400,
};

export async function registerMother(
  overrides: Partial<{ email: string; firstName: string; lastName: string }> = {},
): Promise<{ token: string; id: number }> {
  const response = await api()
    .post("/api/auth/register")
    .send({
      firstName: overrides.firstName ?? "שרה",
      lastName: overrides.lastName ?? "כהן",
      phone: "0501234567",
      email: overrides.email ?? "sara@example.test",
      password: "Password123",
      baby: babyInput,
    });
  if (response.status !== 201) {
    throw new Error(`הרשמה נכשלה: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { token: response.body.token as string, id: response.body.user.id as number };
}

export async function loginStaff(email = "nurse@example.test"): Promise<{ token: string; id: number }> {
  const response = await api().post("/api/auth/login").send({ email, password: "StaffPass123" });
  if (response.status !== 200) {
    throw new Error(`התחברות נכשלה: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { token: response.body.token as string, id: response.body.user.id as number };
}

export const futureIso = (days: number, hour = 8): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};
