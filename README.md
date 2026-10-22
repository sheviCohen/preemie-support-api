# Backend: מערכת תמיכה לאמהות של פגים

שרת API ל-React. Node.js 22, Express, TypeScript, PostgreSQL, Prisma, Zod, JWT, Socket.IO, Swagger.

- **להעלאה לאינטרנט:** `START-HERE.md`
- **לחיבור ל-React:** `FRONTEND-API-GUIDE.md`
- **תיעוד אינטראקטיבי:** `/api-docs` בשרת (עם כפתור Authorize). הקובץ `openapi.json` הוא אותו תיעוד.

## הרצה במחשב
1. התקנות: Node.js 22 ו-PostgreSQL.
2. `npm install`
3. העתיקי `.env.example` ל-`.env` ומלאי `DATABASE_URL` ו-`JWT_SECRET`.
4. `npx prisma migrate deploy` (יוצר את הטבלאות)
5. `npm run seed` (3 אנשי צוות. עם `SEED_DEMO_DATA=true` גם אמהות, לוח, שיחה ומאמרי דוגמה)
6. `npm run dev` ← http://localhost:3000/api-docs

אנשי צוות שנוצרים ב-Seed (פרטים בדויים): `nurse@example.test`, `social@example.test`, `therapist@example.test`.
בפיתוח הסיסמה היא `Staff12345!` אלא אם הוגדרה `SEED_STAFF_PASSWORD`. בפרודקשן חובה להגדיר.
אמהות הדגמה: `mother1@example.test`, `mother2@example.test` (סיסמה `Demo12345!` אלא אם הוגדרה `SEED_DEMO_PASSWORD`).

## סקריפטים
| פקודה | מה עושה |
|---|---|
| `npm run dev` | שרת פיתוח עם טעינה מחדש |
| `npm run build` | `prisma generate` + קומפילציה ל-`dist` |
| `npm run start:prod` | Migrations ואז הפעלת השרת (זה מה ש-Render מריץ) |
| `npm test` | כל הבדיקות |
| `npm run typecheck` | בדיקת טיפוסים |
| `npm run seed` | נתוני פתיחה |
| `npm run openapi:generate` | יוצר מחדש את `openapi.json` |

## בדיקות
- בדיקות יחידה (חזרות בלו"ז, ולידציה, התאמת התיעוד לנתיבים): רצות בלי מסד נתונים.
- בדיקות אינטגרציה (הרשמה, הרשאות, לוח, צ'אטים, התראות, מאמרים, זמן אמת): דורשות מסד נתונים נפרד.
  הגדירי `TEST_DATABASE_URL` (שם המסד חייב להכיל `test`, והבדיקות **מוחקות** בו את כל הנתונים).
  בלי המשתנה הזה הן מדולגות.

## מבנה הנתונים
| טבלה | תוכן |
|---|---|
| User | אמהות ואנשי צוות (role, staffRole, פרטים, תמונה, Hash של סיסמה) |
| Baby | תינוק אחד לכל אמא (שם, תאריך לידה, שבוע, משקל, הערות) |
| ScheduleItem | פריט בלו"ז: תור או משימת טיפול, בעלת, יוצר/ת, איש צוות, `seriesId` לסדרה |
| Conversation | שיחה כללית או פרטית (`directKey` ייחודי מונע שיחה כפולה) |
| ConversationMember | חברות בשיחה + `lastReadAt` (על בסיסו מחושב "לא נקרא") |
| Message | הודעה (עד 2000 תווים) |
| Notification | התראה שמורה: סוג, מונה הודעות, קישור, נקראה/לא |
| Article | מאמר חיצוני (מקור וקישור) או מאמר צוות (טקסט), עם מחבר/ת |

אילוצים ברמת מסד הנתונים: שבוע לידה 22 עד 37, משקל חיובי, אורך הודעה, התאמת מאמר (חיצוני או צוות), התראה אחת לכל פריט/נמען/סוג.

## נתיבים
| | נתיב | הרשאה |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | פתוח (מוגבל בקצב) |
| GET | /api/auth/me | מחוברים |
| GET, PUT | /api/profile | אמהות |
| PUT, DELETE | /api/profile/avatar | מחוברים |
| GET | /api/mothers, /api/staff | מחוברים |
| GET | /api/mothers/:id/profile | צוות |
| GET, POST | /api/schedule | מחוברים (כללים בהמשך) |
| GET, PUT, DELETE | /api/schedule/:id | בעלת הפריט / איש הצוות המשויך. עריכה ומחיקה: רק היוצר/ת |
| GET | /api/conversations | מחוברים |
| POST | /api/conversations/direct | מחוברים |
| GET, POST | /api/conversations/:id/messages | חברי השיחה |
| POST | /api/conversations/:id/read | חברי השיחה |
| GET | /api/notifications | מחוברים (שלי בלבד) |
| POST | /api/notifications/read-all, /api/notifications/:id/read | מחוברים (שלי בלבד) |
| GET | /api/articles, /api/articles/:id | מחוברים |
| POST, PUT, DELETE | /api/articles | צוות. עריכה/מחיקה רק של מאמר שהוספת |
| GET | /api/health-funds | מחוברים |
| GET | /health, /api-docs, /api-docs.json | פתוח |

## החלטות תכנון
- **אבטחה:** סיסמאות ב-bcrypt, JWT חתום (HS256) עם תוקף, Zod על כל קלט, helmet, CORS לפי רשימה, הגבלת קצב להתחברות/הרשמה, אין חשיפת Hash, ולידציה של תמונות (png/jpeg/webp בלבד, עד 200KB).
- **פרטיות:** פריט, שיחה או התראה של מישהי אחרת מחזירים 404 (לא 403), כדי לא לחשוף שהם קיימים.
- **סדרות בלו"ז:** כל הופעה היא שורה נפרדת. השעה המקומית נשמרת גם במעבר שעון קיץ/חורף. מקסימום 365 פריטים.
- **התראות:** נשמרות במסד, נשלחות בזמן אמת ב-Socket.IO, ו"חלון קופץ" של כל מה שלא נקרא נשלח אחרי ההתחברות. הודעות רצופות באותה שיחה מתאגדות להתראה אחת עם מונה.
- **תזכורות:** תהליך ברקע בודק כל דקה. התראה אחת לכל פריט ולכל נמען, והדבר נאכף במסד.
- **הצ'אט הכללי:** הודעות בו מגיעות בזמן אמת בתוך הצ'אט, בלי חלון קופץ לכל הודעה.

## מגבלות ידועות
- ב-Render החינמי השרת נרדם, ואז אין זמן אמת ותזכורות (ראי START-HERE.md).
- הקובץ `package-lock.json` לא נכלל (נוצר בהרצת `npm install`; כדאי להעלות אותו ל-GitHub אחרי ההרצה הראשונה).
- דוא"ל ואיפוס סיסמה לא נכללים בגרסה זו.
