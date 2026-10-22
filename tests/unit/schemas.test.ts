import { describe, expect, it } from "vitest";
import { createArticleSchema } from "../../src/modules/articles/articles.schemas";
import { loginSchema, registerSchema } from "../../src/modules/auth/auth.schemas";
import { avatarSchema, decodedImageBytes } from "../../src/modules/profile/profile.schemas";
import {
  createScheduleSchema,
  updateScheduleSchema,
} from "../../src/modules/schedule/schedule.schemas";
import { sendMessageSchema } from "../../src/modules/conversations/conversations.schemas";

const validBaby = { name: "נועם", birthDate: "2026-09-01", gestationalWeek: 31, birthWeightGrams: 1400 };
const validRegister = {
  firstName: "שרה",
  lastName: "כהן",
  phone: "0501234567",
  email: "  Sara@Example.com ",
  password: "Password123",
  baby: validBaby,
};

function messageOf(result: { success: boolean; error?: { issues: { message: string }[] } }): string {
  return result.error?.issues.map((issue) => issue.message).join(" | ") ?? "";
}

describe("סכמת הרשמה", () => {
  it("מקבלת נתונים תקינים ומנרמלת אימייל", () => {
    const result = registerSchema.safeParse(validRegister);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("sara@example.com");
      expect(result.data.baby.birthDate instanceof Date).toBe(true);
    }
  });

  it("דוחה סיסמה קצרה", () => {
    const result = registerSchema.safeParse({ ...validRegister, password: "short" });
    expect(result.success).toBe(false);
    expect(messageOf(result)).toContain("8 תווים");
  });

  it("דוחה שבוע לידה מחוץ לטווח 22-37", () => {
    expect(registerSchema.safeParse({ ...validRegister, baby: { ...validBaby, gestationalWeek: 40 } }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegister, baby: { ...validBaby, gestationalWeek: 20 } }).success).toBe(false);
  });

  it("דוחה תאריך לידה בעתיד", () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(registerSchema.safeParse({ ...validRegister, baby: { ...validBaby, birthDate: future } }).success).toBe(false);
  });

  it("דוחה משקל לידה שלילי ואימייל לא תקין", () => {
    expect(registerSchema.safeParse({ ...validRegister, baby: { ...validBaby, birthWeightGrams: -5 } }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegister, email: "not-an-email" }).success).toBe(false);
  });

  it("דורשת את פרטי התינוק", () => {
    const { baby: _baby, ...withoutBaby } = validRegister;
    expect(registerSchema.safeParse(withoutBaby).success).toBe(false);
  });
});

describe("סכמת התחברות", () => {
  it("מקבלת אימייל וסיסמה", () => {
    expect(loginSchema.safeParse({ email: "A@b.co", password: "x" }).success).toBe(true);
  });
  it("דוחה סיסמה ריקה", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("סכמת תמונת פרופיל", () => {
  const tinyPng = "data:image/png;base64,iVBORw0KGgo=";
  it("מקבלת תמונה קטנה בפורמט תקין", () => {
    expect(avatarSchema.safeParse({ image: tinyPng }).success).toBe(true);
  });
  it("דוחה פורמט שאינו תמונה (למשל SVG עם סקריפט)", () => {
    expect(avatarSchema.safeParse({ image: "data:image/svg+xml;base64,PHN2Zz4=" }).success).toBe(false);
    expect(avatarSchema.safeParse({ image: "https://example.com/a.png" }).success).toBe(false);
  });
  it("דוחה תמונה גדולה מ-200KB", () => {
    const big = `data:image/png;base64,${"A".repeat(300 * 1024)}`;
    expect(decodedImageBytes(big) > 200 * 1024).toBe(true);
    expect(avatarSchema.safeParse({ image: big }).success).toBe(false);
  });
});

describe("סכמת יצירת פריט בלו\"ז", () => {
  const base = {
    category: "APPOINTMENT",
    type: "WELL_BABY_CLINIC",
    title: "טיפת חלב",
    startAt: "2026-11-01T08:00:00Z",
  };
  it("מקבלת פריט בודד", () => {
    expect(createScheduleSchema.safeParse(base).success).toBe(true);
  });
  it("דוחה סוג שלא מתאים לקטגוריה", () => {
    const result = createScheduleSchema.safeParse({ ...base, type: "MEDICATION" });
    expect(result.success).toBe(false);
    expect(messageOf(result)).toContain("לא מתאים לקטגוריה");
  });
  it("דוחה תאריך בלי אזור זמן", () => {
    expect(createScheduleSchema.safeParse({ ...base, startAt: "2026-11-01T08:00:00" }).success).toBe(false);
  });
  it("חזרה: דורשת בדיוק אחד מ-count או until", () => {
    const rule = { every: 1, unit: "WEEK" };
    expect(createScheduleSchema.safeParse({ ...base, recurrence: { ...rule, count: 4 } }).success).toBe(true);
    expect(createScheduleSchema.safeParse({ ...base, recurrence: { ...rule, until: "2026-12-01T00:00:00Z" } }).success).toBe(true);
    expect(createScheduleSchema.safeParse({ ...base, recurrence: rule }).success).toBe(false);
    expect(
      createScheduleSchema.safeParse({ ...base, recurrence: { ...rule, count: 4, until: "2026-12-01T00:00:00Z" } }).success,
    ).toBe(false);
  });
  it("חזרה: דוחה until לפני ההתחלה, count גדול מדי ויחידה לא מוכרת", () => {
    expect(
      createScheduleSchema.safeParse({ ...base, recurrence: { every: 1, unit: "DAY", until: "2026-10-01T00:00:00Z" } }).success,
    ).toBe(false);
    expect(createScheduleSchema.safeParse({ ...base, recurrence: { every: 1, unit: "DAY", count: 366 } }).success).toBe(false);
    expect(createScheduleSchema.safeParse({ ...base, recurrence: { every: 1, unit: "YEAR", count: 3 } }).success).toBe(false);
  });
  it("דוחה אזור זמן לא קיים", () => {
    expect(createScheduleSchema.safeParse({ ...base, timeZone: "Mars/Base" }).success).toBe(false);
  });
});

describe("סכמת עדכון פריט", () => {
  it("דורשת לפחות שדה אחד", () => {
    expect(updateScheduleSchema.safeParse({}).success).toBe(false);
    expect(updateScheduleSchema.safeParse({ scope: "series" }).success).toBe(false);
  });
  it("ברירת מחדל של scope היא single", () => {
    const result = updateScheduleSchema.safeParse({ title: "חדש" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe("single");
    }
  });
});

describe("סכמת הודעה", () => {
  it("דוחה הודעה ריקה או של רווחים בלבד", () => {
    expect(sendMessageSchema.safeParse({ content: "   " }).success).toBe(false);
  });
  it("דוחה הודעה ארוכה מ-2000 תווים", () => {
    expect(sendMessageSchema.safeParse({ content: "א".repeat(2001) }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ content: "א".repeat(2000) }).success).toBe(true);
  });
});

describe("סכמת מאמר", () => {
  const common = { title: "כותרת", summary: "תקציר", category: "FEEDING" };
  it("מקבלת מאמר חיצוני עם מקור וקישור", () => {
    expect(createArticleSchema.safeParse({ ...common, sourceName: "אתר", sourceUrl: "https://example.com/a" }).success).toBe(true);
  });
  it("מקבלת מאמר צוות עם תוכן", () => {
    expect(createArticleSchema.safeParse({ ...common, body: "תוכן" }).success).toBe(true);
  });
  it("דוחה מאמר בלי תוכן ובלי מקור", () => {
    expect(createArticleSchema.safeParse(common).success).toBe(false);
  });
  it("דוחה שילוב של תוכן ומקור", () => {
    expect(
      createArticleSchema.safeParse({ ...common, body: "תוכן", sourceName: "אתר", sourceUrl: "https://example.com" }).success,
    ).toBe(false);
  });
  it("דוחה מקור בלי קישור וקישור שאינו http(s)", () => {
    expect(createArticleSchema.safeParse({ ...common, sourceName: "אתר" }).success).toBe(false);
    expect(createArticleSchema.safeParse({ ...common, sourceName: "אתר", sourceUrl: "javascript:alert(1)" }).success).toBe(false);
  });
});
