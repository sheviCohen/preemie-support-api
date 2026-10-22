# מדריך ל-React: איך מדברים עם ה-API

כל מה שה-React צריך לדעת. אין כאן קוד React, רק מה לשלוח, מה חוזר, ומה לעשות עם זה.
תיעוד אינטראקטיבי ומדויק של כל פעולה: `/api-docs` בשרת.

## 1. עקרונות
- כתובת בסיס: כתובת השרת (למשל `https://preemie-support-api.onrender.com`). שימי אותה במשתנה סביבה ב-React.
- כל הגוף והתשובות הם JSON. כותרת: `Content-Type: application/json`.
- אחרי התחברות, כל בקשה נשלחת עם הכותרת: `Authorization: Bearer <token>`.
- תאריכים נשלחים ומתקבלים בפורמט ISO עם אזור זמן: `2026-11-01T08:00:00Z`. להצגה מתרגמים לשעה מקומית בדפדפן.
- Token פג אחרי 24 שעות (ברירת מחדל). קוד 401 = להתחבר מחדש.
- שגיאה מגיעה תמיד באותו מבנה:
  `{ "error": { "code": "...", "message": "הודעה בעברית", "details": [...] } }`
  אפשר להציג את `message` למשתמשת כמו שהוא. ב-`details` (בשגיאות 400) יש פירוט לפי שדה.

### קודי שגיאה
| סטטוס | code | משמעות |
|---|---|---|
| 400 | VALIDATION_ERROR | נתונים לא תקינים (`details` מפרט איזה שדה) |
| 400 | TOO_MANY_OCCURRENCES | סדרה חוזרת ארוכה מ-365 פריטים |
| 401 | UNAUTHORIZED / INVALID_TOKEN | לא מחוברת או Token לא תקף ← לשלוח למסך התחברות |
| 401 | INVALID_CREDENTIALS | אימייל או סיסמה שגויים |
| 403 | FORBIDDEN | אין הרשאה לפעולה |
| 404 | NOT_FOUND | לא נמצא. גם כשמדובר בפריט פרטי של מישהי אחרת |
| 409 | EMAIL_TAKEN | האימייל כבר רשום |
| 429 | TOO_MANY_REQUESTS | יותר מדי ניסיונות התחברות/הרשמה |

## 2. הרשמה והתחברות
- `POST /api/auth/register` (אמהות בלבד נרשמות כך): firstName, lastName, phone, email, password (8 תווים ומעלה), city (לא חובה), ו-`baby`: name, birthDate (`2026-09-01`), gestationalWeek (22 עד 37), birthWeightGrams, notes (לא חובה).
  מחזיר 201 עם `token` ו-`user`. אחרי הרשמה המשתמשת כבר מחוברת.
- `POST /api/auth/login`: email, password. מחזיר `token` ו-`user`.
- `GET /api/auth/me`: מי אני. שימושי בטעינת האתר כשיש Token שמור.
- `user.role` הוא `MOTHER` או `STAFF`. לפיו קובעים אילו מסכים להציג. אצל צוות `user.staffRole` הוא אחד מ: `NURSE`, `SOCIAL_WORKER`, `DEVELOPMENTAL_THERAPIST`.

## 3. פרופיל
- `GET /api/profile` ו-`PUT /api/profile` (אמהות בלבד). ב-PUT שולחים רק מה שהשתנה, ו-`baby` כאובייקט חלקי.
- תמונת פרופיל: `user.avatar` הוא `null` או data URL. כש-`null`, מציגים עיגול עם האות הראשונה של השם הפרטי.
  - `PUT /api/profile/avatar` עם `{ "image": "data:image/png;base64,..." }`. פורמטים: png, jpeg, webp. **עד 200KB**, לכן כדאי לכווץ את התמונה בדפדפן לפני השליחה.
  - `DELETE /api/profile/avatar` מוחק.
- איש צוות רואה פרופיל מלא של אמא ותינוק (צפייה בלבד): `GET /api/mothers/:id/profile`.

## 4. רשימות אנשים
- `GET /api/mothers?search=` : האמהות הרשומות (בלי המשתמשת עצמה). חוזרים רק: id, שם, עיר, תמונה. אין טלפון ואימייל.
- `GET /api/staff?search=` : אנשי הצוות.
- אלה הרשימות לפתיחת שיחה, ולבחירת אמא בלו"ז של איש צוות.

## 5. לוח זמנים
כל פריט הוא **תור** (`category: APPOINTMENT`) או **משימת טיפול** (`CARE_TASK`).

### סוגים (`type`) ותוויות בעברית
| קטגוריה | type | תווית |
|---|---|---|
| APPOINTMENT | MEDICAL_CHECKUP | ביקורת רפואית |
| APPOINTMENT | WELL_BABY_CLINIC | טיפת חלב |
| APPOINTMENT | SPEECH_THERAPY | קלינאית תקשורת |
| APPOINTMENT | PHYSIOTHERAPY | פיזיותרפיה |
| APPOINTMENT | SCHEDULED_CHAT | צ'אט מתוזמן עם צוות |
| APPOINTMENT | STAFF_MEETING | פגישה עם צוות |
| APPOINTMENT | OTHER_APPOINTMENT | תור אחר |
| CARE_TASK | MEDICATION | תרופה |
| CARE_TASK | VITAMINS | ויטמינים |
| CARE_TASK | INHALATION | אינהלציה |
| CARE_TASK | FEEDING | האכלה |
| CARE_TASK | PHYSIO_EXERCISES | תרגילי פיזיותרפיה |
| CARE_TASK | OTHER_CARE_TASK | משימת טיפול אחרת |

הסוג חייב להתאים לקטגוריה, אחרת 400.

### פעולות
- `GET /api/schedule?from=&to=&category=&type=` : הלו"ז שלי, ממוין לפי זמן. לצוות: הפגישות שהוא קבע (אפשר גם `ownerId=` לסינון לפי אמא).
- `POST /api/schedule` : יצירה.
  - אמא: category, type, title, startAt, וגם notes ו-`withWhom` (טקסט חופשי, למשל שם רופא שאינו רשום במערכת).
  - איש צוות: חייב גם `ownerId` (האמא). מותר רק `SCHEDULED_CHAT` ו-`STAFF_MEETING`. האמא מקבלת התראה עם קישור ליומן.
  - פריט חוזר: מוסיפים `recurrence`: `{ "every": 1, "unit": "WEEK", "count": 10 }` (`unit`: DAY, WEEK, MONTH). במקום `count` אפשר `until` (תאריך סיום). בדיוק אחד מהם. השרת יוצר פריט נפרד לכל הופעה, ומחזיר את כולם ב-`items` יחד עם `seriesId`.
  - `timeZone` (לא חובה, ברירת מחדל Asia/Jerusalem): שעון הקיץ והחורף מטופלים נכון, והשעה נשמרת.
- `PUT /api/schedule/:id` : עריכה. `scope`: `single` (ברירת מחדל) או `series` (כל הסדרה). בעריכת סדרה, שינוי `startAt` משנה רק את **שעת היום**.
- `DELETE /api/schedule/:id?scope=single|series`.
- בכל פריט יש `canEdit`: אם `false`, לא מציגים כפתורי עריכה/מחיקה (למשל פגישה שהצוות קבע לאמא).
- פריטי סדרה מזוהים לפי `seriesId`. אם יש, אפשר לשאול "רק את הפריט הזה או את כל הסדרה?".

### קישורי קופות החולים (בצד המסך)
`GET /api/health-funds` מחזיר רשימה של `{ id, name, url }`. אלה דפי הבית של הקופות. קישור ישיר לקביעת תור לא אומת, ואפשר לעדכן אותו בקובץ `src/modules/healthFunds/healthFunds.ts`.

## 6. צ'אטים
- `GET /api/conversations` : כל השיחות. לכל שיחה: `type` (`GENERAL` או `DIRECT`), `withUser` (בשיחה פרטית), `lastMessage`, `unreadCount`, `hasUnread`.
  - **סימון שיחה עם הודעה שלא נקראה:** להציג בולט כש-`hasUnread` הוא true. `totalUnread` הוא הסכום לכל השיחות.
  - הצ'אט הכללי (`GENERAL`) תמיד ברשימה. שיחה פרטית מופיעה רק אחרי שנשלחה בה הודעה.
- `POST /api/conversations/direct` עם `{ "userId": 7 }` : פותח שיחה פרטית עם כל אמא או איש צוות, או מחזיר את הקיימת. התשובה כוללת `conversation.id`. אחר כך עוברים למסך השיחה.
- `GET /api/conversations/:id/messages?limit=50&beforeId=` : ההודעות מהישנה לחדשה. כדי לטעון הודעות ישנות יותר שולחים `beforeId` של ההודעה הראשונה שמוצגת. `hasMore` אומר אם יש עוד.
- `POST /api/conversations/:id/messages` עם `{ "content": "..." }` (עד 2000 תווים).
- `POST /api/conversations/:id/read` : לקרוא כשהמשתמשת פותחת את השיחה. מנקה את סימון "לא נקרא" ואת ההתראות של השיחה.
- אין סימון "מחוברת/מחובר" (online) במערכת.

## 7. התראות
כל התראה: `id, type, title, body, count, link, isRead, createdAt`.
- `link` הוא נתיב בתוך האתר שלך (למשל `/chats/12` או `/schedule?date=2026-11-01`). חברי אותו לנתבים שלך בצד ה-React. אם הנתיבים אצלך שונים, תרגמי לפי `type`.
- `count`: בהתראה על הודעות, כמה הודעות חדשות. ב-`body` כבר כתוב "יש לך 23 הודעות חדשות מ...!".

| type | מתי |
|---|---|
| NEW_CHAT | פתחו שיחה חדשה איתך |
| NEW_MESSAGE | הודעה חדשה בשיחה פרטית |
| APPOINTMENT_REMINDER | תזכורת לתור (30 דקות לפני, ניתן לשינוי בשרת) |
| CARE_TASK_REMINDER | תזכורת למשימת טיפול |
| APPOINTMENT_CREATED_BY_STAFF | איש צוות קבע לך פגישה |

- `GET /api/notifications?unreadOnly=true&limit=&beforeId=` : דף ההתראות. מחזיר גם `unreadCount`.
- `POST /api/notifications/:id/read`, `POST /api/notifications/read-all`.
- **בצ'אט הכללי אין חלון קופץ על כל הודעה.** הודעות בו מגיעות בזמן אמת בתוך הצ'אט עצמו.

## 8. זמן אמת (Socket.IO)
משתמשים בספריית `socket.io-client`. מתחברים לכתובת השרת, ומעבירים את ה-Token כך: `auth: { token }`.
חיבור בלי Token תקין נדחה (שגיאת `connect_error`, הודעה `UNAUTHORIZED`).

| אירוע שמגיע מהשרת | תוכן | מה עושים |
|---|---|---|
| `notification:new` | התראה אחת | להציג חלון קופץ + להוסיף לדף ההתראות |
| `notification:updated` | התראה שהמונה שלה עלה | לעדכן את החלון/הרשימה (לפי `id`) |
| `notification:backlog` | `{ notifications: [...] }` | כל ההתראות שלא נקראו, כמה שניות אחרי ההתחברות. להציג חלון קופץ מרוכז |
| `message:new` | הודעה אחת | אם השיחה פתוחה, להוסיף אותה. אחרת לעדכן את סימון "לא נקרא" |

- התראות נשמרות במסד, ולכן גם אם לא היית מחוברת, תקבלי אותן ב-`notification:backlog` בכניסה הבאה.
- פתחי חיבור אחד אחרי התחברות, וסגרי אותו בהתנתקות. אם ה-Token מתחדש, התחברי מחדש.

## 9. מאמרים
- `GET /api/articles?search=&category=&kind=&limit=&offset=` : הרשימה (בלי הטקסט המלא). מחזיר גם `total`.
- `GET /api/articles/:id` : מאמר אחד. במאמר צוות יש גם `body`.
- `kind`: `external` = כרטיס עם `sourceName` ו-`sourceUrl` (נפתח בלשונית חדשה), `staff` = מאמר שצוות כתב, עם טקסט מלא.
- קטגוריות (`category`): FEEDING האכלה, DEVELOPMENT התפתחות, SLEEP שינה, EMOTIONAL_SUPPORT רגשות ותמיכה לאמא, TREATMENTS טיפולים ומעקב, RIGHTS זכויות והטבות, OTHER אחר.
- צוות בלבד: `POST /api/articles`, `PUT /api/articles/:id`, `DELETE /api/articles/:id`. אפשר לערוך ולמחוק רק מאמר שהוספת בעצמך (`canEdit`).
  - מאמר חיצוני: title, summary, category, sourceName, sourceUrl.
  - מאמר צוות: title, summary, category, body.

## 10. מי רואה מה
| פעולה | אמא | איש צוות |
|---|---|---|
| פרופיל עצמי (עריכה) | כן | לא רלוונטי |
| פרופיל מלא של אמא | לא | צפייה בלבד |
| לו"ז | שלה בלבד | הפגישות שהוא קבע |
| יצירת פריטים בלו"ז | לעצמה, כל סוג | לאמא, רק צ'אט מתוזמן / פגישה |
| עריכה/מחיקה בלו"ז | פריטים שיצרה בעצמה | פריטים שיצר בעצמו |
| שיחות | שלה ושל הצ'אט הכללי | שלו ושל הצ'אט הכללי |
| מאמרים | קריאה | קריאה, ועריכה/מחיקה של שלו |
