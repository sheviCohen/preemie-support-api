import type { DbClient } from "../db/prisma";
import { joinGeneralConversation } from "../modules/conversations/general";
import { hashPassword } from "../utils/password";

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

    // לו"ז לדוגמה
    await db.scheduleItem.createMany({
      data: [
        { ownerId: user.id, createdById: user.id, category: "APPOINTMENT", type: "WELL_BABY_CLINIC", title: "טיפת חלב", startAt: new Date(now + 2 * DAY), withWhom: "אחות טיפת חלב" },
        { ownerId: user.id, createdById: user.id, category: "CARE_TASK", type: "VITAMINS", title: "ויטמין D", startAt: new Date(now + DAY) },
        { ownerId: user.id, createdById: nurseId, staffId: nurseId, category: "APPOINTMENT", type: "SCHEDULED_CHAT", title: "שיחה עם האחות", startAt: new Date(now + 3 * DAY) },
      ],
    });
  }

  // שיחה פרטית לדוגמה בין האחות לאמא הראשונה, עם הודעה שלא נקראה
  const first = motherIds[0];
  if (first !== undefined) {
    const directKey = `${Math.min(first, nurseId)}-${Math.max(first, nurseId)}`;
    const existing = await db.conversation.findUnique({ where: { directKey }, select: { id: true } });
    if (!existing) {
      const conversation = await db.conversation.create({
        data: {
          type: "DIRECT",
          directKey,
          members: { create: [{ userId: first }, { userId: nurseId, lastReadAt: new Date() }] },
          messages: { create: [{ senderId: nurseId, content: "שלום, אני כאן אם יש שאלות על התינוק." }] },
        },
        select: { id: true },
      });
      await db.notification.create({
        data: {
          userId: first,
          type: "NEW_CHAT",
          title: "שיחה חדשה",
          body: "רחל לוי פתחה שיחה איתך",
          link: `/chats/${conversation.id}`,
          conversationId: conversation.id,
        },
      });
    }
  }

  // מאמרי דוגמה. תוכן אמיתי יוסיפו אנשי הצוות דרך המערכת.
  const articleCount = await db.article.count();
  if (articleCount === 0) {
    await db.article.createMany({
      data: [
        {
          authorId: nurseId,
          title: "[דוגמה] מדריך קצר להאכלת פגים",
          summary: "מאמר צוות לדוגמה, כדי לראות איך נראה מאמר עם טקסט מלא.",
          category: "FEEDING",
          body: "זהו טקסט לדוגמה בלבד. יש להחליף אותו בתוכן אמיתי שנכתב על ידי איש צוות.",
        },
        {
          authorId: nurseId,
          title: "[דוגמה] מאמר חיצוני",
          summary: "כרטיס לדוגמה של מאמר מאתר חיצוני. הקישור כאן אינו אמיתי.",
          category: "EMOTIONAL_SUPPORT",
          sourceName: "אתר לדוגמה",
          sourceUrl: "https://example.com/article",
        },
      ],
    });
  }
}
