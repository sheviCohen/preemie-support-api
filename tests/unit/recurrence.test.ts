import { describe, expect, it } from "vitest";
import { generateOccurrences, TooManyOccurrencesError, withTimeOfDay } from "../../src/lib/recurrence";
import { getLocalParts, zonedTimeToUtc } from "../../src/lib/timezone";

const TZ = "Asia/Jerusalem";
const iso = (dates: Date[]) => dates.map((date) => date.toISOString());

describe("יצירת פריטים קבועים (recurrence)", () => {
  it("בלי כלל חזרה מוחזרת הופעה אחת בלבד, במועד המדויק", () => {
    const start = new Date("2026-10-22T06:00:00.000Z");
    expect(iso(generateOccurrences(start, undefined, TZ))).toEqual(["2026-10-22T06:00:00.000Z"]);
  });

  it("כל יום ב-09:00 נשאר ב-09:00 גם אחרי המעבר לשעון חורף (25.10.2026)", () => {
    const start = new Date("2026-10-22T06:00:00.000Z"); // 09:00 שעון קיץ
    const result = generateOccurrences(start, { every: 1, unit: "DAY", count: 5 }, TZ);
    expect(iso(result)).toEqual([
      "2026-10-22T06:00:00.000Z",
      "2026-10-23T06:00:00.000Z",
      "2026-10-24T06:00:00.000Z",
      "2026-10-25T07:00:00.000Z",
      "2026-10-26T07:00:00.000Z",
    ]);
    for (const occurrence of result) {
      expect(getLocalParts(occurrence, TZ).hour).toBe(9);
    }
  });

  it("כל שבוע ביום ראשון ב-10:00: 3 הופעות, גם מעבר שעון באמצע", () => {
    const start = new Date("2026-10-18T07:00:00.000Z"); // יום ראשון 10:00 שעון קיץ
    const result = generateOccurrences(start, { every: 1, unit: "WEEK", count: 3 }, TZ);
    expect(iso(result)).toEqual([
      "2026-10-18T07:00:00.000Z",
      "2026-10-25T08:00:00.000Z",
      "2026-11-01T08:00:00.000Z",
    ]);
  });

  it("כל שבועיים", () => {
    const start = new Date("2026-11-01T08:00:00.000Z");
    const result = generateOccurrences(start, { every: 2, unit: "WEEK", count: 3 }, TZ);
    expect(iso(result)).toEqual([
      "2026-11-01T08:00:00.000Z",
      "2026-11-15T08:00:00.000Z",
      "2026-11-29T08:00:00.000Z",
    ]);
  });

  it("כל חודש ב-31: מתקצר לסוף החודש וחוזר ל-31", () => {
    const start = new Date("2026-01-31T08:00:00.000Z"); // 10:00 שעון חורף
    const result = generateOccurrences(start, { every: 1, unit: "MONTH", count: 4 }, TZ);
    expect(iso(result)).toEqual([
      "2026-01-31T08:00:00.000Z",
      "2026-02-28T08:00:00.000Z",
      "2026-03-31T07:00:00.000Z",
      "2026-04-30T07:00:00.000Z",
    ]);
  });

  it("כל חודש עובר גבול שנה", () => {
    const start = new Date("2026-11-15T08:00:00.000Z");
    const result = generateOccurrences(start, { every: 1, unit: "MONTH", count: 3 }, TZ);
    expect(iso(result)).toEqual([
      "2026-11-15T08:00:00.000Z",
      "2026-12-15T08:00:00.000Z",
      "2027-01-15T08:00:00.000Z",
    ]);
  });

  it("תאריך סיום כולל את היום האחרון", () => {
    const start = new Date("2026-11-01T08:00:00.000Z");
    const until = new Date("2026-11-04T08:00:00.000Z");
    const result = generateOccurrences(start, { every: 1, unit: "DAY", until }, TZ);
    expect(result).toHaveLength(4);
    expect(result[3].toISOString()).toBe("2026-11-04T08:00:00.000Z");
  });

  it("תאריך סיום לפני ההופעה השנייה נותן הופעה אחת", () => {
    const start = new Date("2026-11-01T08:00:00.000Z");
    const until = new Date("2026-11-01T20:00:00.000Z");
    expect(generateOccurrences(start, { every: 1, unit: "DAY", until }, TZ)).toHaveLength(1);
  });

  it("יותר מ-365 פריטים נדחה", () => {
    const start = new Date("2026-11-01T08:00:00.000Z");
    expect(() => generateOccurrences(start, { every: 1, unit: "DAY", count: 366 }, TZ)).toThrow(
      TooManyOccurrencesError,
    );
    const farUntil = new Date("2030-01-01T00:00:00.000Z");
    expect(() => generateOccurrences(start, { every: 1, unit: "DAY", until: farUntil }, TZ)).toThrow(
      TooManyOccurrencesError,
    );
  });

  it("365 פריטים בדיוק מותר", () => {
    const start = new Date("2026-11-01T08:00:00.000Z");
    expect(generateOccurrences(start, { every: 1, unit: "DAY", count: 365 }, TZ)).toHaveLength(365);
  });

  it("אזור זמן UTC לא מושפע משעון קיץ", () => {
    const start = new Date("2026-10-22T06:00:00.000Z");
    const result = generateOccurrences(start, { every: 1, unit: "DAY", count: 5 }, "UTC");
    expect(result.every((date) => date.getUTCHours() === 6)).toBe(true);
  });
});

describe("עריכת שעה לכל הסדרה (withTimeOfDay)", () => {
  it("שומר את התאריך של כל פריט ומחליף את השעה", () => {
    const item = new Date("2026-10-26T07:00:00.000Z"); // 26.10 ב-09:00 שעון חורף
    const newTime = new Date("2026-10-22T07:30:00.000Z"); // 10:30 שעון קיץ
    expect(withTimeOfDay(item, newTime, TZ).toISOString()).toBe("2026-10-26T08:30:00.000Z");
  });
});

describe("המרת שעה מקומית (zonedTimeToUtc)", () => {
  it("ממיר נכון בקיץ ובחורף", () => {
    const summer = zonedTimeToUtc({ year: 2026, month: 7, day: 1, hour: 12, minute: 0, second: 0 }, TZ);
    const winter = zonedTimeToUtc({ year: 2026, month: 1, day: 1, hour: 12, minute: 0, second: 0 }, TZ);
    expect(summer.toISOString()).toBe("2026-07-01T09:00:00.000Z");
    expect(winter.toISOString()).toBe("2026-01-01T10:00:00.000Z");
  });
});
