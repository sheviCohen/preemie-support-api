import type { DbClient } from "../db/prisma";
import { getOrCreateGeneralConversation, joinGeneralConversation } from "../modules/conversations/general";

// שיחות לדוגמה: צ'אט כללי מלא ושיחות פרטיות, כדי שהצ'אט ייראה פעיל.
// בטוח להרצה חוזרת: שיחה שכבר יש בה את כל ההודעות לא משתנה.

const HOUR = 60 * 60 * 1000;

/** שורה בתסריט של שיחה: מי שולח/ת (0 = המשתתף/ת הראשון/ה, 1 = השני/ה) ומה */
type Line = [0 | 1, string];

interface DemoChat {
  users: [number, number];
  /** כמה שעות לפני עכשיו נשלחה ההודעה האחרונה */
  endHoursAgo: number;
  /** כמה מההודעות האחרונות לא נקראו אצל המשתתף/ת הראשון/ה */
  unreadForFirst: number;
  lines: Line[];
}

export async function seedDemoChats(db: DbClient, motherIds: number[], staffIds: number[]): Promise<void> {
  const [nurse, social, therapist] = staffIds;
  const [m1, m2, m3, m4, m5, m6] = motherIds;
  if (
    nurse === undefined || social === undefined || therapist === undefined ||
    m1 === undefined || m2 === undefined || m3 === undefined ||
    m4 === undefined || m5 === undefined || m6 === undefined
  ) {
    return;
  }

  const [m7, m8, m9, m10, m11, m12] = motherIds.slice(6);
  const more: Array<[number | undefined, string]> = [
    [m7, "שלום לכולן, אני דבורה. אליה נולדה בשבוע 27, והיום היא כבר בת חמישה חודשים 💪"],
    [m10, "ברוכה הבאה! אורי שלנו נולד בשבוע 30, אז אני מבינה אותך לגמרי"],
    [m8, "שאלה: מתי התחלתן לרחוץ את התינוק באמבטיה רגילה?"],
    [m11, "אצלנו אחרי שבועיים בבית, במים פושרים ולא יותר מחמש דקות"],
    [m9, "הדס התחילה לחייך השבוע! איזה רגע מרגש 😍"],
    [m12, "מזל טוב! זה הרגע הכי מתוק"],
  ];
  const moreLines = more.filter((line): line is [number, string] => line[0] !== undefined);

  await seedGeneralChat(db, [
    ...moreLines,
    [nurse, "בוקר טוב לכולן! תזכורת: מחר יש מפגש תמיכה בזום בשעה 20:00"],
    [m2, "תודה! אני אצטרף"],
    [m3, "מישהי יודעת איך מתמודדים עם גזים? אריאל בוכה המון בערב"],
    [m1, "לנו עזר עיסוי בטן בתנועות סיבוביות"],
    [m5, "גם תנועות אופניים עם הרגליים עוזרות"],
    [therapist, "נכון! תנועות אופניים עדינות ועיסוי עם כיוון השעון. אפשר גם להחזיק אותו על הבטן, על הזרוע"],
    [m3, "תודה רבה, ננסה הערב 🙏"],
    [m4, "מישהי ממליצה על עגלה שמתאימה לפגים?"],
    [m6, "חנה, אשלח לך בפרטי"],
    [social, "תזכורת: מי שעוד לא הגישה בקשה לגמלה מביטוח לאומי, אני כאן לעזור"],
    [m2, "יעל הגיעה היום ל־3 ק\"ג!! 🎉"],
    [m1, "מזל טוב!!! ❤️"],
    [m5, "איזה יופי!"],
    [nurse, "כל הכבוד לך לאה, עבודה מדהימה"],
    [m6, "יש למישהי טיפ לשינה? נגה מתעוררת כל שעה"],
    [m1, "אצלנו עזרו חיתול עוטף ושגרה קבועה לפני השינה"],
    [nurse, "מעולה. וזכרו להשכיב את התינוקות לישון על הגב 🙂"],
    [m3, "אריאל ישן אתמול 4 שעות ברצף! תודה על הטיפים"],
  ]);

  const chats: DemoChat[] = [
    {
      users: [m1, nurse], endHoursAgo: 1, unreadForFirst: 2, lines: [
        [1, "שלום, אני כאן אם יש שאלות על התינוק."],
        [0, "תודה רבה! נועם שותה רק 40 מ\"ל בכל האכלה, זה מספיק?"],
        [1, "בגיל שלו זה בטווח התקין. העיקר שהוא עולה במשקל. כמה הוא שקל בשקילה האחרונה?"],
        [0, "2.1 ק\"ג, עלייה של 150 גרם בשבוע"],
        [1, "מצוין! זו עלייה יפה מאוד. תמשיכי ככה 👏"],
        [0, "ועוד שאלה: מתי מותר לצאת איתו לטיול בחוץ?"],
        [1, "אפשר כבר עכשיו, רק לא במקומות צפופים, ולשמור עליו מחום ומקור."],
        [1, "קבעתי לנו שיחה ביום חמישי, נעבור על הכול ביחד"],
        [1, "ואל תשכחי את ויטמין D 😊"],
      ],
    },
    {
      users: [m1, social], endHoursAgo: 3, unreadForFirst: 1, lines: [
        [1, "היי שרה, רציתי לשאול איך את מרגישה השבוע?"],
        [0, "קצת עייפה, הלילות קשים"],
        [1, "זה לגמרי מובן. יש מישהו שיכול לעזור לך בלילות לפעמים?"],
        [0, "בעלי עוזר כשהוא יכול, ואמא שלי מגיעה פעם בשבוע"],
        [1, "יופי. חשוב שתמצאי גם זמן לעצמך, אפילו חצי שעה ביום"],
        [1, "הוספתי מאמר על הזכויות של אמהות לפגים, שווה לקרוא"],
      ],
    },
    {
      users: [m1, m2], endHoursAgo: 5, unreadForFirst: 1, lines: [
        [1, "שרה! ראיתי שגם נועם נולד בשבוע 31"],
        [0, "כן! ויעל שלך נולדה בשבוע 28, נכון? איך היא?"],
        [1, "ברוך ה', מתחזקת. כבר כמעט 3 ק\"ג!"],
        [0, "וואו, איזה כיף לשמוע ❤️"],
        [1, "רוצה להיפגש בטיפת חלב ביום שני? גם לי יש תור"],
        [0, "בשמחה! ניפגש שם"],
        [1, "מעולה, נתראה 😊"],
      ],
    },
    {
      users: [m1, therapist], endHoursAgo: 20, unreadForFirst: 0, lines: [
        [1, "שלום שרה, לקראת הפגישה: שימי לב אם נועם מרים את הראש כשהוא שוכב על הבטן"],
        [0, "הוא מנסה, אבל רק לכמה שניות"],
        [1, "זה מצוין לגיל המתוקן שלו. נתרגל ביחד בפגישה"],
        [0, "תודה רבה, מחכה לפגישה"],
      ],
    },
    {
      users: [m1, m3], endHoursAgo: 26, unreadForFirst: 0, lines: [
        [1, "היי, אני רבקה. הבן שלי, אריאל, נולד בשבוע 30"],
        [0, "נעים מאוד! איך אתם מסתדרים?"],
        [1, "לאט לאט. באילו בקבוקים אתם משתמשים?"],
        [0, "אנחנו עם פטמה לפגים, בזרימה איטית. זה עזר לנו מאוד"],
        [1, "תודה! אנסה"],
      ],
    },
    {
      users: [m2, nurse], endHoursAgo: 8, unreadForFirst: 0, lines: [
        [0, "שלום רחל, ליעל יש קצת נזלת. צריך לדאוג?"],
        [1, "יש חום?"],
        [0, "לא, 36.8"],
        [1, "אז אפשר לשטוף את האף במי מלח ולהמשיך לעקוב. אם יש קושי בנשימה או חום, לפנות לרופא מיד"],
        [0, "תודה, הרגעת אותי"],
      ],
    },
    {
      users: [m3, nurse], endHoursAgo: 12, unreadForFirst: 0, lines: [
        [0, "שלום, אריאל לא רוצה לאכול מהבקבוק"],
        [1, "ממתי זה התחיל?"],
        [0, "מאתמול בערב"],
        [1, "נסי פטמה בזרימה איטית יותר, בסביבה שקטה. אם זה ממשיך מחר, תכתבי לי"],
        [0, "אנסה, תודה!"],
      ],
    },
    {
      users: [m4, social], endHoursAgo: 30, unreadForFirst: 0, lines: [
        [0, "שלום מירב, אני צריכה עזרה עם הטפסים לביטוח לאומי"],
        [1, "בשמחה. איזה טופס?"],
        [0, "גמלה לילד עם צרכים מיוחדים. אני לא בטוחה מה למלא"],
        [1, "בואי נקבע פגישה ונמלא ביחד. מתי נוח לך?"],
        [0, "ביום ראשון בבוקר"],
        [1, "קבענו: ראשון ב־10:00"],
      ],
    },
    {
      users: [m5, therapist], endHoursAgo: 16, unreadForFirst: 0, lines: [
        [0, "יוסף התחיל להתהפך! 🎉"],
        [1, "איזה יופי! זה צעד חשוב"],
        [0, "ממשיכים עם התרגילים?"],
        [1, "כן, 10 דקות ביום של זמן בטן, ובפגישה נוסיף תרגיל חדש"],
      ],
    },
    {
      users: [m6, m4], endHoursAgo: 6, unreadForFirst: 0, lines: [
        [0, "חנה, ראיתי בצ'אט הכללי ששאלת על עגלות. מצאתי משהו טוב"],
        [1, "באמת? איזו?"],
        [0, "עגלה שנשכבת לגמרי, מתאימה לפגים. אשלח לך את הקישור"],
        [1, "תודה רבה!!"],
      ],
    },
  ];

  for (const chat of chats) {
    await seedDirectChat(db, chat);
  }
}

/** ממלא את הצ'אט הכללי, רק אם יש בו עדיין מעט הודעות */
async function seedGeneralChat(db: DbClient, lines: Array<[number, string]>): Promise<void> {
  const general = await getOrCreateGeneralConversation(db);
  const count = await db.message.count({ where: { conversationId: general.id } });
  if (count >= lines.length) return;

  const now = Date.now();
  const times = lines.map((_, index) => new Date(now - 2 * HOUR - (lines.length - 1 - index) * 2.5 * HOUR));
  for (const [senderId] of lines) {
    await joinGeneralConversation(db, senderId);
  }
  await db.message.createMany({
    data: lines.map(([senderId, content], index) => ({ conversationId: general.id, senderId, content, createdAt: times[index] })),
  });

  // שלוש ההודעות האחרונות נשארות "לא נקראו", אצל מי שעוד לא קרא/ה אחריהן
  const readUntil = times[times.length - 4];
  await db.conversationMember.updateMany({
    where: { conversationId: general.id, OR: [{ lastReadAt: null }, { lastReadAt: { lt: readUntil } }] },
    data: { lastReadAt: readUntil },
  });
}

/** יוצר שיחה פרטית עם ההודעות שבתסריט. אם השיחה קיימת עם פחות הודעות, משלים את החסרות */
async function seedDirectChat(db: DbClient, chat: DemoChat): Promise<void> {
  const [first, second] = chat.users;
  const directKey = `${Math.min(first, second)}-${Math.max(first, second)}`;
  const existing = await db.conversation.findUnique({
    where: { directKey },
    select: { id: true, _count: { select: { messages: true } } },
  });
  if (existing && existing._count.messages >= chat.lines.length) return;

  const now = Date.now();
  const step = 40 * 60 * 1000; // 40 דקות בין הודעה להודעה
  const end = now - chat.endHoursAgo * HOUR;
  const times = chat.lines.map((_, index) => new Date(end - (chat.lines.length - 1 - index) * step));

  const conversationId =
    existing?.id ??
    (await db.conversation.create({ data: { type: "DIRECT", directKey }, select: { id: true } })).id;
  const alreadyThere = existing?._count.messages ?? 0;
  const last = existing
    ? await db.message.findFirst({ where: { conversationId }, orderBy: { id: "desc" }, select: { createdAt: true } })
    : null;

  await db.message.createMany({
    data: chat.lines.slice(alreadyThere).map(([who, content], offset) => {
      const index = alreadyThere + offset;
      // הודעה שמשלימה שיחה קיימת לא יכולה להיות מוקדמת מההודעה האחרונה שכבר בה
      const minTime = last ? last.createdAt.getTime() + (offset + 1) * 60 * 1000 : 0;
      const createdAt = new Date(Math.min(now, Math.max(times[index].getTime(), minTime)));
      return { conversationId, senderId: chat.users[who], content, createdAt };
    }),
  });

  const lastTime = times[times.length - 1];
  const firstReadUntil = times[times.length - 1 - chat.unreadForFirst];
  const members: Array<[number, Date]> = [[first, firstReadUntil], [second, lastTime]];
  for (const [userId, lastReadAt] of members) {
    await db.conversationMember.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, lastReadAt },
      update: { lastReadAt },
    });
  }
}
