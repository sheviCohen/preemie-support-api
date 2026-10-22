import { MAX_SERIES_ITEMS, type RecurrenceUnit } from "../domain/constants";
import { getLocalParts, zonedTimeToUtc, type LocalParts } from "./timezone";

// יצירת פריט קבוע בלוח: השרת מחשב את כל ההופעות ויוצר פריט רגיל נפרד לכל אחת.

export interface RecurrenceRule {
  /** כל כמה יחידות (למשל 2 ביחד עם WEEK = כל שבועיים) */
  every: number;
  unit: RecurrenceUnit;
  /** מספר ההופעות הכולל, כולל הראשונה */
  count?: number;
  /** תאריך סיום: לא נוצרות הופעות אחריו */
  until?: Date;
}

export class TooManyOccurrencesError extends Error {
  constructor() {
    super(`הסדרה כוללת יותר מ-${MAX_SERIES_ITEMS} פריטים`);
    this.name = "TooManyOccurrencesError";
  }
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function occurrenceAt(base: LocalParts, rule: RecurrenceRule, index: number, timeZone: string): Date {
  let year: number;
  let monthIndex: number;
  let day: number;

  if (rule.unit === "MONTH") {
    // מחושב תמיד מהיום המקורי: 31 בינואר, 28 בפברואר, 31 במרץ
    const totalMonths = base.month - 1 + index * rule.every;
    year = base.year + Math.floor(totalMonths / 12);
    monthIndex = ((totalMonths % 12) + 12) % 12;
    day = Math.min(base.day, daysInMonth(year, monthIndex));
  } else {
    const stepDays = index * rule.every * (rule.unit === "WEEK" ? 7 : 1);
    const shifted = new Date(Date.UTC(base.year, base.month - 1, base.day + stepDays));
    year = shifted.getUTCFullYear();
    monthIndex = shifted.getUTCMonth();
    day = shifted.getUTCDate();
  }

  return zonedTimeToUtc(
    { year, month: monthIndex + 1, day, hour: base.hour, minute: base.minute, second: base.second },
    timeZone,
  );
}

/**
 * מחזיר את כל ההופעות של פריט, לפי השעה המקומית באזור הזמן (השעה נשמרת גם אחרי מעבר שעון).
 * ללא כלל חזרה מוחזרת הופעה אחת. ההופעה הראשונה היא תמיד מועד ההתחלה המדויק.
 */
export function generateOccurrences(start: Date, rule: RecurrenceRule | undefined, timeZone: string): Date[] {
  const first = new Date(start.getTime());
  if (!rule) {
    return [first];
  }
  if (rule.count !== undefined && rule.count > MAX_SERIES_ITEMS) {
    throw new TooManyOccurrencesError();
  }

  const base = getLocalParts(start, timeZone);
  const wanted = rule.count ?? Number.POSITIVE_INFINITY;
  const occurrences: Date[] = [first];

  for (let index = 1; occurrences.length < wanted; index += 1) {
    const next = occurrenceAt(base, rule, index, timeZone);
    if (rule.until !== undefined && next.getTime() > rule.until.getTime()) {
      break;
    }
    occurrences.push(next);
    if (occurrences.length > MAX_SERIES_ITEMS) {
      throw new TooManyOccurrencesError();
    }
  }
  return occurrences;
}

/** לוקח את התאריך של `instant` ואת השעה של `timeSource` (לפי אזור הזמן). לעריכת שעה של כל הסדרה. */
export function withTimeOfDay(instant: Date, timeSource: Date, timeZone: string): Date {
  const date = getLocalParts(instant, timeZone);
  const time = getLocalParts(timeSource, timeZone);
  return zonedTimeToUtc(
    {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: time.hour,
      minute: time.minute,
      second: time.second,
    },
    timeZone,
  );
}
