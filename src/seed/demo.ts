import type { DbClient } from "../db/prisma";
import { joinGeneralConversation } from "../modules/conversations/general";
import { hashPassword } from "../utils/password";
import { seedDemoArticles } from "./demoArticles";
import { seedDemoChats } from "./demoChats";

// נתוני הדגמה לפיתוח ולבדיקה מול ה-React. לא מיועדים לפרודקשן אמיתי.

const DAY = 24 * 60 * 60 * 1000;

export async function seedDemo(db: DbClient, password: string, staffIds: number[]): Promise<void> {
  const passwordHash = await hashPassword(password);
  const now = Date.now();
  const nurseId = staffIds[0];
  if (nurseId === undefined) {
    throw new Error("אין אנשי צוות. יש להריץ קודם את bootstrap");
  }

  const mothers = [
    { email: "mother1@example.test", firstName: "שרה", lastName: "גולד", phone: "0510000001", city: "ירושלים", baby: { name: "נועם", weeks: 31, grams: 1400, born: now - 60 * DAY } },
    { email: "mother2@example.test", firstName: "לאה", lastName: "פרידמן", phone: "0510000002", city: "בני ברק", baby: { name: "יעל", weeks: 28, grams: 1100, born: now - 120 * DAY } },
    { email: "mother3@example.test", firstName: "רבקה", lastName: "כץ", phone: "0510000003", city: "פתח תקווה", baby: { name: "אריאל", weeks: 30, grams: 1300, born: now - 45 * DAY } },
    { email: "mother4@example.test", firstName: "חנה", lastName: "לוין", phone: "0510000004", city: "חיפה", baby: { name: "שירה", weeks: 32, grams: 1650, born: now - 30 * DAY } },
    { email: "mother5@example.test", firstName: "מרים", lastName: "אדלר", phone: "0510000005", city: "אשדוד", baby: { name: "יוסף", weeks: 29, grams: 1200, born: now - 90 * DAY } },
    { email: "mother6@example.test", firstName: "אסתר", lastName: "שפירא", phone: "0510000006", city: "מודיעין", baby: { name: "נגה", weeks: 33, grams: 1800, born: now - 20 * DAY } },
    { email: "mother7@example.test", firstName: "דבורה", lastName: "רוזן", phone: "0510000007", city: "רחובות", baby: { name: "אליה", weeks: 27, grams: 950, born: now - 150 * DAY } },
    { email: "mother8@example.test", firstName: "שושנה", lastName: "ברגר", phone: "0510000008", city: "בית שמש", baby: { name: "מתן", weeks: 34, grams: 2000, born: now - 15 * DAY } },
    { email: "mother9@example.test", firstName: "יהודית", lastName: "קליין", phone: "0510000009", city: "נתניה", baby: { name: "הדס", weeks: 31, grams: 1500, born: now - 70 * DAY } },
    { email: "mother10@example.test", firstName: "נעמי", lastName: "גרין", phone: "0510000010", city: "ירושלים", baby: { name: "אורי", weeks: 30, grams: 1350, born: now - 100 * DAY } },
    { email: "mother11@example.test", firstName: "תמר", lastName: "וייס", phone: "0510000011", city: "אלעד", baby: { name: "אביגיל", weeks: 29, grams: 1250, born: now - 50 * DAY } },
    { email: "mother12@example.test", firstName: "רחל", lastName: "הורוביץ", phone: "0510000012", city: "חולון", baby: { name: "דוד", weeks: 32, grams: 1700, born: now - 35 * DAY } },
  ];

  const motherIds: number[] = [];
  for (const mother of mothers) {
    const existing = await db.user.findUnique({ where: { email: mother.email }, select: { id: true } });
    if (existing) {
      motherIds.push(existing.id);
      continue;
    }
    const user = await db.user.create({
      data: {
        email: mother.email,
        passwordHash,
        role: "MOTHER",
        firstName: mother.firstName,
        lastName: mother.lastName,
        phone: mother.phone,
        city: mother.city,
        baby: {
          create: {
            name: mother.baby.name,
            birthDate: new Date(mother.baby.born),
            gestationalWeek: mother.baby.weeks,
            birthWeightGrams: mother.baby.grams,
          },
        },
      },
      select: { id: true },
    });
    await joinGeneralConversation(db, user.id);
    motherIds.push(user.id);
  }

  await seedDemoChats(db, motherIds, staffIds);
  await seedDemoArticles(db, staffIds);
  await seedUpcomingSchedule(db, motherIds, staffIds);
}

const UPCOMING_WEEKS = 4;

/**
 * לו"ז לדוגמה לשבוע הנוכחי ולשלושת השבועות הבאים, מראשון עד שישי (בשבת אין משימות).
 * פריט שכבר קיים (אותה כותרת ואותה שעה) לא נוצר שוב, ולכן אפשר להריץ שוב בלי כפילויות.
 */
async function seedUpcomingSchedule(db: DbClient, motherIds: number[], staffIds: number[]): Promise<void> {
  const [nurseId, socialId] = staffIds;
  if (nurseId === undefined || socialId === undefined) return;

  const firstWeek = new Date();
  firstWeek.setUTCHours(0, 0, 0, 0);
  firstWeek.setUTCDate(firstWeek.getUTCDate() - firstWeek.getUTCDay()); // יום ראשון

  for (const motherId of motherIds) {
    for (let week = 0; week < UPCOMING_WEEKS; week++) {
      const weekStart = firstWeek.getTime() + week * 7 * DAY;

      // שעות ב-UTC: 06:00 UTC הוא 08:00 או 09:00 בישראל
      const at = (day: number, hourUtc: number) => new Date(weekStart + day * DAY + hourUtc * 60 * 60 * 1000);
      const mine = { ownerId: motherId, createdById: motherId };
      const therapy = week % 2 === 0
        ? { type: "PHYSIOTHERAPY" as const, title: "פיזיותרפיה", withWhom: "פיזיותרפיסטית התפתחותית" }
        : { type: "SPEECH_THERAPY" as const, title: "קלינאית תקשורת", withWhom: "קלינאית תקשורת" };
      const weekdays = [0, 1, 2, 3, 4, 5]; // ראשון עד שישי

      const items = [
        ...weekdays.map((day) => ({ ...mine, category: "CARE_TASK" as const, type: "VITAMINS" as const, title: "ויטמין D", startAt: at(day, 6) })),
        ...weekdays.map((day) => ({ ...mine, category: "CARE_TASK" as const, type: "MEDICATION" as const, title: "ברזל", startAt: at(day, day === 5 ? 6 : 16), notes: "לפני ההאכלה" })),
        ...[0, 2, 4].map((day) => ({ ...mine, category: "CARE_TASK" as const, type: "PHYSIO_EXERCISES" as const, title: "תרגילי פיזיותרפיה", startAt: at(day, 11), notes: "10 דקות של זמן בטן" })),
        ...[1, 3].map((day) => ({ ...mine, category: "CARE_TASK" as const, type: "INHALATION" as const, title: "אינהלציה", startAt: at(day, 15) })),
        { ...mine, category: "CARE_TASK" as const, type: "FEEDING" as const, title: "רישום כמויות האכלה", startAt: at(2, 13), notes: "לקראת השקילה הבאה" },
        { ...mine, category: "APPOINTMENT" as const, type: "WELL_BABY_CLINIC" as const, title: "טיפת חלב: שקילה ומדידה", startAt: at(1, 7), withWhom: "אחות טיפת חלב" },
        { ...mine, category: "APPOINTMENT" as const, type: therapy.type, title: therapy.title, startAt: at(3, 8), withWhom: therapy.withWhom },
        { ...mine, category: "APPOINTMENT" as const, type: "MEDICAL_CHECKUP" as const, title: "ביקורת אצל רופא הילדים", startAt: at(2, 8), withWhom: "רופא הילדים" },
        { ownerId: motherId, createdById: nurseId, staffId: nurseId, category: "APPOINTMENT" as const, type: "SCHEDULED_CHAT" as const, title: "שיחה עם האחות", startAt: at(4, 9) },
        { ownerId: motherId, createdById: socialId, staffId: socialId, category: "APPOINTMENT" as const, type: "STAFF_MEETING" as const, title: "פגישה עם העובדת הסוציאלית", startAt: at(0, 10) },
      ];

      const existing = await db.scheduleItem.findMany({
        where: { ownerId: motherId, startAt: { gte: new Date(weekStart), lt: new Date(weekStart + 7 * DAY) } },
        select: { title: true, startAt: true },
      });
      const taken = new Set(existing.map((item) => `${item.title}|${item.startAt.getTime()}`));
      const missing = items.filter((item) => !taken.has(`${item.title}|${item.startAt.getTime()}`));
      if (missing.length > 0) {
        await db.scheduleItem.createMany({ data: missing });
      }
    }
  }
}
