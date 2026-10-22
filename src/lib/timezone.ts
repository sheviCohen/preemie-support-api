// חישובי שעה לפי אזור זמן (כולל מעבר בין שעון קיץ לשעון חורף), ללא ספריות חיצוניות.
// הדבר חשוב כדי שתרופה שנקבעה ל-09:00 תישאר ב-09:00 גם אחרי מעבר השעון.

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** התאריך והשעה כפי שהם נראים על השעון באזור הזמן הנתון */
export function getLocalParts(date: Date, timeZone: string): LocalParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((item) => item.type === type);
    return part ? Number(part.value) : 0;
  };
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const local = getLocalParts(date, timeZone);
  const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  return localAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** ממיר שעה מקומית (כפי שמופיעה על השעון באזור הזמן) לרגע מדויק (UTC) */
export function zonedTimeToUtc(parts: LocalParts, timeZone: string): Date {
  const guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const firstPass = guess - offsetMs(new Date(guess), timeZone);
  const secondPass = guess - offsetMs(new Date(firstPass), timeZone);
  return new Date(secondPass);
}
