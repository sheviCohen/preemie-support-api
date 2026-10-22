import {
  APPOINTMENT_TYPES,
  ARTICLE_CATEGORIES,
  CARE_TASK_TYPES,
  NOTIFICATION_TYPES,
  RECURRENCE_UNITS,
  SCHEDULE_CATEGORIES,
  SCHEDULE_TYPES,
  STAFF_ROLES,
} from "../domain/constants";

// תיעוד OpenAPI 3 כתוב ביד. הבדיקות מוודאות שכל נתיב אמיתי מופיע כאן.

type Json = Record<string, unknown>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = (schema: Json, required = true) => ({
  required,
  content: { "application/json": { schema } },
});
const jsonResponse = (description: string, schema: Json) => ({
  description,
  content: { "application/json": { schema } },
});
const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: ref("ErrorResponse") } },
});
const idParam = { name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } };
const secured = [{ bearerAuth: [] }];
const COMMON_AUTH_ERRORS = {
  "401": errorResponse("לא מחוברת, או Token לא תקין / פג תוקף"),
};
const VALIDATION = { "400": errorResponse("נתונים לא תקינים (VALIDATION_ERROR)") };
const FORBIDDEN = { "403": errorResponse("אין הרשאה") };
const NOT_FOUND = { "404": errorResponse("לא נמצא") };

const queryParam = (name: string, schema: Json, description: string) => ({
  name,
  in: "query",
  required: false,
  schema,
  description,
});

const scopeParam = queryParam(
  "scope",
  { type: "string", enum: ["single", "series"], default: "single" },
  "single: הפריט הזה בלבד. series: כל הפריטים באותה סדרה חוזרת.",
);

export const openApiDocument: Json = {
  openapi: "3.0.3",
  info: {
    title: "API למערכת תמיכה לאמהות של פגים",
    version: "1.0.0",
    description:
      "Backend למערכת תמיכה לאמהות של תינוקות פגים: לוח זמנים, צ'אטים, התראות, מאמרים.\n\n" +
      "**איך מתחברים כאן:** קוראים ל-`POST /api/auth/login`, מעתיקים את ה-token מהתשובה, לוחצים על Authorize ומדביקים אותו.\n\n" +
      "**זמן אמת:** התראות והודעות חדשות מגיעות דרך Socket.IO (ראו FRONTEND-API-GUIDE.md). Swagger לא מדגים WebSocket.",
  },
  servers: [{ url: "/", description: "השרת הנוכחי" }],
  tags: [
    { name: "Auth", description: "הרשמה והתחברות" },
    { name: "Profile", description: "פרופיל אמא ותינוק" },
    { name: "Users", description: "רשימות אמהות ואנשי צוות" },
    { name: "Schedule", description: "לוח זמנים: תורים ומשימות טיפול" },
    { name: "Conversations", description: "צ'אטים" },
    { name: "Notifications", description: "התראות" },
    { name: "Articles", description: "מאמרים" },
    { name: "HealthFunds", description: "קישורים לקופות החולים" },
    { name: "System", description: "בדיקת תקינות" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "בדיקת תקינות השרת ומסד הנתונים",
        responses: {
          "200": jsonResponse("תקין", ref("Health")),
          "503": jsonResponse("מסד הנתונים לא זמין", ref("Health")),
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "הרשמת אמא חדשה (כולל פרטי התינוק)",
        requestBody: jsonBody(ref("RegisterRequest")),
        responses: {
          "201": jsonResponse("נרשמה בהצלחה", ref("AuthResponse")),
          ...VALIDATION,
          "409": errorResponse("האימייל כבר רשום (EMAIL_TAKEN)"),
          "429": errorResponse("יותר מדי ניסיונות"),
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "התחברות (אמא או איש צוות)",
        requestBody: jsonBody(ref("LoginRequest")),
        responses: {
          "200": jsonResponse("מחוברת", ref("AuthResponse")),
          ...VALIDATION,
          "401": errorResponse("אימייל או סיסמה שגויים (INVALID_CREDENTIALS)"),
          "429": errorResponse("יותר מדי ניסיונות"),
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "פרטי המשתמש/ת המחוברים",
        security: secured,
        responses: { "200": jsonResponse("המשתמש/ת", { type: "object", properties: { user: ref("Self") } }), ...COMMON_AUTH_ERRORS },
      },
    },
    "/api/profile": {
      get: {
        tags: ["Profile"],
        summary: "הפרופיל המשותף של האמא והתינוק (אמהות בלבד)",
        security: secured,
        responses: { "200": jsonResponse("הפרופיל", { type: "object", properties: { user: ref("Self") } }), ...COMMON_AUTH_ERRORS, ...FORBIDDEN },
      },
      put: {
        tags: ["Profile"],
        summary: "עריכת הפרופיל (אמהות בלבד). שדה שלא נשלח לא משתנה.",
        security: secured,
        requestBody: jsonBody(ref("UpdateProfileRequest")),
        responses: {
          "200": jsonResponse("הפרופיל המעודכן", { type: "object", properties: { user: ref("Self") } }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
          ...FORBIDDEN,
          "409": errorResponse("האימייל כבר רשום"),
        },
      },
    },
    "/api/profile/avatar": {
      put: {
        tags: ["Profile"],
        summary: "העלאת תמונת פרופיל (data URL, עד 200KB)",
        security: secured,
        requestBody: jsonBody({
          type: "object",
          required: ["image"],
          properties: { image: { type: "string", example: "data:image/png;base64,iVBORw0KGgo..." } },
        }),
        responses: {
          "200": jsonResponse("נשמרה", { type: "object", properties: { avatar: { type: "string" } } }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
        },
      },
      delete: {
        tags: ["Profile"],
        summary: "מחיקת תמונת פרופיל (חוזרים לעיגול עם האות הראשונה)",
        security: secured,
        responses: { "204": { description: "נמחקה" }, ...COMMON_AUTH_ERRORS },
      },
    },
    "/api/mothers": {
      get: {
        tags: ["Users"],
        summary: "רשימת אמהות רשומות (שם, תמונה ועיר בלבד), לפתיחת שיחה או לבחירה בלו\"ז",
        security: secured,
        parameters: [
          queryParam("search", { type: "string" }, "חיפוש לפי שם"),
          queryParam("limit", { type: "integer", default: 100, maximum: 100 }, "מספר תוצאות"),
        ],
        responses: {
          "200": jsonResponse("רשימה", {
            type: "object",
            properties: { mothers: { type: "array", items: ref("MotherListItem") } },
          }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
        },
      },
    },
    "/api/mothers/{id}/profile": {
      get: {
        tags: ["Users"],
        summary: "פרופיל מלא של אמא ותינוק, לצפייה בלבד (צוות בלבד)",
        security: secured,
        parameters: [idParam],
        responses: {
          "200": jsonResponse("הפרופיל", { type: "object", properties: { user: ref("Self") } }),
          ...COMMON_AUTH_ERRORS,
          ...FORBIDDEN,
          ...NOT_FOUND,
        },
      },
    },
    "/api/staff": {
      get: {
        tags: ["Users"],
        summary: "רשימת אנשי צוות",
        security: secured,
        parameters: [
          queryParam("search", { type: "string" }, "חיפוש לפי שם"),
          queryParam("limit", { type: "integer", default: 100, maximum: 100 }, "מספר תוצאות"),
        ],
        responses: {
          "200": jsonResponse("רשימה", {
            type: "object",
            properties: { staff: { type: "array", items: ref("StaffListItem") } },
          }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
        },
      },
    },
    "/api/schedule": {
      get: {
        tags: ["Schedule"],
        summary: "הלו\"ז שלי. אמא: הפריטים שלה. איש צוות: הפגישות שלו.",
        security: secured,
        parameters: [
          queryParam("from", { type: "string", format: "date-time" }, "מתאריך"),
          queryParam("to", { type: "string", format: "date-time" }, "עד תאריך"),
          queryParam("category", { type: "string", enum: [...SCHEDULE_CATEGORIES] }, "סינון לפי קטגוריה"),
          queryParam("type", { type: "string", enum: [...SCHEDULE_TYPES] }, "סינון לפי סוג"),
          queryParam("ownerId", { type: "integer" }, "איש צוות בלבד: סינון לפי אמא"),
          queryParam("limit", { type: "integer", default: 500, maximum: 1000 }, "מספר תוצאות"),
        ],
        responses: {
          "200": jsonResponse("הפריטים לפי סדר זמן", {
            type: "object",
            properties: { items: { type: "array", items: ref("ScheduleItem") } },
          }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
        },
      },
      post: {
        tags: ["Schedule"],
        summary: "יצירת פריט בלו\"ז, אפשר גם פריט חוזר (נוצרים פריטים נפרדים)",
        description:
          "אמא: יוצרת לעצמה כל קטגוריה וסוג, ויכולה לציין withWhom (שם גורם שאינו רשום במערכת).\n\n" +
          "איש צוות: חובה ownerId (האמא), רק צ'אט מתוזמן / פגישה עם צוות. האמא מקבלת התראה עם קישור ליומן.\n\n" +
          "recurrence: every + unit + (count או until). עד 365 פריטים.",
        security: secured,
        requestBody: jsonBody(ref("CreateScheduleRequest")),
        responses: {
          "201": jsonResponse("נוצר", {
            type: "object",
            properties: {
              items: { type: "array", items: ref("ScheduleItem") },
              seriesId: { type: "string", nullable: true },
            },
          }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
          ...FORBIDDEN,
          ...NOT_FOUND,
        },
      },
    },
    "/api/schedule/{id}": {
      get: {
        tags: ["Schedule"],
        summary: "פריט אחד בלו\"ז",
        security: secured,
        parameters: [idParam],
        responses: {
          "200": jsonResponse("הפריט", { type: "object", properties: { item: ref("ScheduleItem") } }),
          ...COMMON_AUTH_ERRORS,
          ...NOT_FOUND,
        },
      },
      put: {
        tags: ["Schedule"],
        summary: "עריכת פריט (רק מי שיצר/ה אותו). scope=series משנה את כל הסדרה.",
        description:
          "בעריכת סדרה (scope=series) שינוי startAt משנה רק את **שעת היום** של כל הפריטים. התאריכים נשארים.",
        security: secured,
        parameters: [idParam],
        requestBody: jsonBody(ref("UpdateScheduleRequest")),
        responses: {
          "200": jsonResponse("הפריטים המעודכנים", {
            type: "object",
            properties: { items: { type: "array", items: ref("ScheduleItem") } },
          }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
          ...FORBIDDEN,
          ...NOT_FOUND,
        },
      },
      delete: {
        tags: ["Schedule"],
        summary: "מחיקת פריט (רק מי שיצר/ה אותו). scope=series מוחק את כל הסדרה.",
        security: secured,
        parameters: [idParam, scopeParam],
        responses: {
          "200": jsonResponse("נמחק", { type: "object", properties: { deleted: { type: "integer" } } }),
          ...COMMON_AUTH_ERRORS,
          ...FORBIDDEN,
          ...NOT_FOUND,
        },
      },
    },
    "/api/conversations": {
      get: {
        tags: ["Conversations"],
        summary: "כל השיחות שלי. שיחה עם הודעה שלא נקראה מסומנת (hasUnread, unreadCount).",
        security: secured,
        responses: {
          "200": jsonResponse("השיחות", {
            type: "object",
            properties: {
              conversations: { type: "array", items: ref("Conversation") },
              totalUnread: { type: "integer" },
            },
          }),
          ...COMMON_AUTH_ERRORS,
        },
      },
    },
    "/api/conversations/direct": {
      post: {
        tags: ["Conversations"],
        summary: "פתיחת שיחה פרטית עם משתמש/ת, או החזרת הקיימת",
        security: secured,
        requestBody: jsonBody({
          type: "object",
          required: ["userId"],
          properties: { userId: { type: "integer" } },
        }),
        responses: {
          "200": jsonResponse("השיחה הקיימת", { type: "object", properties: { conversation: ref("Conversation") } }),
          "201": jsonResponse("שיחה חדשה", { type: "object", properties: { conversation: ref("Conversation") } }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
          ...NOT_FOUND,
        },
      },
    },
    "/api/conversations/{id}/messages": {
      get: {
        tags: ["Conversations"],
        summary: "הודעות בשיחה (מהישנה לחדשה). beforeId לטעינת הודעות ישנות יותר.",
        security: secured,
        parameters: [
          idParam,
          queryParam("beforeId", { type: "integer" }, "הודעות שקדמו להודעה הזו"),
          queryParam("limit", { type: "integer", default: 50, maximum: 100 }, "מספר הודעות"),
        ],
        responses: {
          "200": jsonResponse("הודעות", {
            type: "object",
            properties: { messages: { type: "array", items: ref("Message") }, hasMore: { type: "boolean" } },
          }),
          ...COMMON_AUTH_ERRORS,
          ...NOT_FOUND,
        },
      },
      post: {
        tags: ["Conversations"],
        summary: "שליחת הודעה",
        security: secured,
        parameters: [idParam],
        requestBody: jsonBody({
          type: "object",
          required: ["content"],
          properties: { content: { type: "string", maxLength: 2000 } },
        }),
        responses: {
          "201": jsonResponse("נשלחה", { type: "object", properties: { message: ref("Message") } }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
          ...NOT_FOUND,
        },
      },
    },
    "/api/conversations/{id}/read": {
      post: {
        tags: ["Conversations"],
        summary: "סימון השיחה כנקראה (מסיר את סימון ה\"לא נקרא\" ואת ההתראות של השיחה)",
        security: secured,
        parameters: [idParam],
        responses: {
          "200": jsonResponse("בוצע", { type: "object", properties: { ok: { type: "boolean" } } }),
          ...COMMON_AUTH_ERRORS,
          ...NOT_FOUND,
        },
      },
    },
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "דף ההתראות שלי (מהחדשה לישנה)",
        security: secured,
        parameters: [
          queryParam("unreadOnly", { type: "string", enum: ["true", "false"], default: "false" }, "רק שלא נקראו"),
          queryParam("limit", { type: "integer", default: 50, maximum: 100 }, "מספר תוצאות"),
          queryParam("beforeId", { type: "integer" }, "התראות ישנות מהמזהה הזה"),
        ],
        responses: {
          "200": jsonResponse("ההתראות", {
            type: "object",
            properties: {
              notifications: { type: "array", items: ref("Notification") },
              unreadCount: { type: "integer" },
            },
          }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
        },
      },
    },
    "/api/notifications/read-all": {
      post: {
        tags: ["Notifications"],
        summary: "סימון כל ההתראות כנקראו",
        security: secured,
        responses: {
          "200": jsonResponse("בוצע", { type: "object", properties: { updated: { type: "integer" } } }),
          ...COMMON_AUTH_ERRORS,
        },
      },
    },
    "/api/notifications/{id}/read": {
      post: {
        tags: ["Notifications"],
        summary: "סימון התראה אחת כנקראה",
        security: secured,
        parameters: [idParam],
        responses: {
          "200": jsonResponse("ההתראה", { type: "object", properties: { notification: ref("Notification") } }),
          ...COMMON_AUTH_ERRORS,
          ...NOT_FOUND,
        },
      },
    },
    "/api/articles": {
      get: {
        tags: ["Articles"],
        summary: "רשימת מאמרים, עם חיפוש וסינון",
        security: secured,
        parameters: [
          queryParam("search", { type: "string" }, "חיפוש בכותרת, בתקציר ובשם המקור"),
          queryParam("category", { type: "string", enum: [...ARTICLE_CATEGORIES] }, "קטגוריה"),
          queryParam("kind", { type: "string", enum: ["external", "staff"] }, "external: מאמר חיצוני. staff: מאמר צוות."),
          queryParam("limit", { type: "integer", default: 20, maximum: 100 }, "מספר תוצאות"),
          queryParam("offset", { type: "integer", default: 0 }, "דילוג"),
        ],
        responses: {
          "200": jsonResponse("המאמרים", {
            type: "object",
            properties: {
              articles: { type: "array", items: ref("Article") },
              total: { type: "integer" },
            },
          }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
        },
      },
      post: {
        tags: ["Articles"],
        summary: "הוספת מאמר (צוות בלבד). חיצוני: sourceName + sourceUrl. מאמר צוות: body.",
        security: secured,
        requestBody: jsonBody(ref("CreateArticleRequest")),
        responses: {
          "201": jsonResponse("נוצר", { type: "object", properties: { article: ref("Article") } }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
          ...FORBIDDEN,
        },
      },
    },
    "/api/articles/{id}": {
      get: {
        tags: ["Articles"],
        summary: "מאמר אחד (כולל טקסט מלא במאמר צוות)",
        security: secured,
        parameters: [idParam],
        responses: {
          "200": jsonResponse("המאמר", { type: "object", properties: { article: ref("Article") } }),
          ...COMMON_AUTH_ERRORS,
          ...NOT_FOUND,
        },
      },
      put: {
        tags: ["Articles"],
        summary: "עריכת מאמר (רק איש הצוות שהוסיף אותו)",
        security: secured,
        parameters: [idParam],
        requestBody: jsonBody(ref("UpdateArticleRequest")),
        responses: {
          "200": jsonResponse("המאמר המעודכן", { type: "object", properties: { article: ref("Article") } }),
          ...VALIDATION,
          ...COMMON_AUTH_ERRORS,
          ...FORBIDDEN,
          ...NOT_FOUND,
        },
      },
      delete: {
        tags: ["Articles"],
        summary: "מחיקת מאמר (רק איש הצוות שהוסיף אותו)",
        security: secured,
        parameters: [idParam],
        responses: { "204": { description: "נמחק" }, ...COMMON_AUTH_ERRORS, ...FORBIDDEN, ...NOT_FOUND },
      },
    },
    "/api/health-funds": {
      get: {
        tags: ["HealthFunds"],
        summary: "קישורים לאתרי קופות החולים (לצד מסך הלו\"ז)",
        security: secured,
        responses: {
          "200": jsonResponse("הקישורים", {
            type: "object",
            properties: {
              healthFunds: {
                type: "array",
                items: {
                  type: "object",
                  properties: { id: { type: "string" }, name: { type: "string" }, url: { type: "string" } },
                },
              },
            },
          }),
          ...COMMON_AUTH_ERRORS,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Health: {
        type: "object",
        properties: { status: { type: "string" }, database: { type: "string" } },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string" },
              details: { description: "פירוט שגיאות לפי שדה (בשגיאות ולידציה)" },
            },
          },
        },
      },
      Baby: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          birthDate: { type: "string", format: "date-time" },
          gestationalWeek: { type: "integer", minimum: 22, maximum: 37 },
          birthWeightGrams: { type: "integer" },
          notes: { type: "string", nullable: true },
        },
      },
      BabyInput: {
        type: "object",
        required: ["name", "birthDate", "gestationalWeek", "birthWeightGrams"],
        properties: {
          name: { type: "string", example: "נועם" },
          birthDate: { type: "string", example: "2026-09-01" },
          gestationalWeek: { type: "integer", example: 31 },
          birthWeightGrams: { type: "integer", example: 1400 },
          notes: { type: "string", nullable: true },
        },
      },
      Self: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string" },
          role: { type: "string", enum: ["MOTHER", "STAFF"] },
          firstName: { type: "string" },
          lastName: { type: "string" },
          phone: { type: "string" },
          city: { type: "string", nullable: true },
          avatar: { type: "string", nullable: true, description: "data URL, או null (מציגים עיגול עם האות הראשונה)" },
          staffRole: { type: "string", enum: [...STAFF_ROLES], nullable: true },
          createdAt: { type: "string", format: "date-time" },
          baby: { allOf: [ref("Baby")], nullable: true },
        },
      },
      UserSummary: {
        type: "object",
        properties: {
          id: { type: "integer" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          role: { type: "string", enum: ["MOTHER", "STAFF"] },
          staffRole: { type: "string", enum: [...STAFF_ROLES], nullable: true },
          avatar: { type: "string", nullable: true },
        },
      },
      MotherListItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          city: { type: "string", nullable: true },
          avatar: { type: "string", nullable: true },
        },
      },
      StaffListItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          staffRole: { type: "string", enum: [...STAFF_ROLES], nullable: true },
          avatar: { type: "string", nullable: true },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["firstName", "lastName", "phone", "email", "password", "baby"],
        properties: {
          firstName: { type: "string", example: "שרה" },
          lastName: { type: "string", example: "כהן" },
          phone: { type: "string", example: "0501234567" },
          email: { type: "string", example: "sara@example.com" },
          password: { type: "string", minLength: 8, example: "Password123" },
          city: { type: "string", nullable: true },
          baby: ref("BabyInput"),
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "sara@example.com" },
          password: { type: "string", example: "Password123" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: { token: { type: "string" }, user: ref("Self") },
      },
      UpdateProfileRequest: {
        type: "object",
        description: "כל שדה אופציונלי",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          city: { type: "string", nullable: true },
          baby: {
            type: "object",
            description: "כל שדה של התינוק אופציונלי",
            properties: {
              name: { type: "string" },
              birthDate: { type: "string" },
              gestationalWeek: { type: "integer" },
              birthWeightGrams: { type: "integer" },
              notes: { type: "string", nullable: true },
            },
          },
        },
      },
      ScheduleItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          category: { type: "string", enum: [...SCHEDULE_CATEGORIES] },
          type: { type: "string", enum: [...SCHEDULE_TYPES], description: `תורים: ${APPOINTMENT_TYPES.join(", ")}. משימות טיפול: ${CARE_TASK_TYPES.join(", ")}` },
          title: { type: "string" },
          notes: { type: "string", nullable: true },
          withWhom: { type: "string", nullable: true },
          startAt: { type: "string", format: "date-time" },
          seriesId: { type: "string", nullable: true },
          owner: ref("UserSummary"),
          staff: { allOf: [ref("UserSummary")], nullable: true },
          createdByRole: { type: "string", enum: ["MOTHER", "STAFF"] },
          canEdit: { type: "boolean", description: "האם המשתמש/ת המחוברים רשאים לערוך ולמחוק" },
        },
      },
      CreateScheduleRequest: {
        type: "object",
        required: ["category", "type", "title", "startAt"],
        properties: {
          ownerId: { type: "integer", description: "איש צוות בלבד: מזהה האמא" },
          category: { type: "string", enum: [...SCHEDULE_CATEGORIES] },
          type: { type: "string", enum: [...SCHEDULE_TYPES] },
          title: { type: "string", example: "ביקור בטיפת חלב" },
          notes: { type: "string", nullable: true },
          withWhom: { type: "string", nullable: true, example: "ד\"ר לוי" },
          startAt: { type: "string", format: "date-time", example: "2026-11-01T08:00:00Z" },
          timeZone: { type: "string", default: "Asia/Jerusalem" },
          recurrence: {
            type: "object",
            properties: {
              every: { type: "integer", example: 1 },
              unit: { type: "string", enum: [...RECURRENCE_UNITS] },
              count: { type: "integer", description: "מספר הופעות כולל. בדיוק אחד מ-count / until." },
              until: { type: "string", format: "date-time" },
            },
          },
        },
      },
      UpdateScheduleRequest: {
        type: "object",
        description: "כל שדה אופציונלי, אבל חובה לשלוח לפחות אחד",
        properties: {
          type: { type: "string", enum: [...SCHEDULE_TYPES] },
          title: { type: "string" },
          notes: { type: "string", nullable: true },
          withWhom: { type: "string", nullable: true },
          startAt: { type: "string", format: "date-time" },
          timeZone: { type: "string" },
          scope: { type: "string", enum: ["single", "series"], default: "single" },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "integer" },
          conversationId: { type: "integer" },
          content: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          sender: ref("UserSummary"),
        },
      },
      Conversation: {
        type: "object",
        properties: {
          id: { type: "integer" },
          type: { type: "string", enum: ["GENERAL", "DIRECT"] },
          title: { type: "string", nullable: true },
          withUser: { allOf: [ref("UserSummary")], nullable: true },
          lastMessage: { allOf: [ref("Message")], nullable: true },
          unreadCount: { type: "integer" },
          hasUnread: { type: "boolean" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "integer" },
          type: { type: "string", enum: [...NOTIFICATION_TYPES] },
          title: { type: "string" },
          body: { type: "string" },
          count: { type: "integer" },
          link: { type: "string", nullable: true },
          conversationId: { type: "integer", nullable: true },
          scheduleItemId: { type: "integer", nullable: true },
          isRead: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Article: {
        type: "object",
        properties: {
          id: { type: "integer" },
          kind: { type: "string", enum: ["external", "staff"] },
          title: { type: "string" },
          summary: { type: "string" },
          category: { type: "string", enum: [...ARTICLE_CATEGORIES] },
          sourceName: { type: "string", nullable: true },
          sourceUrl: { type: "string", nullable: true },
          body: { type: "string", nullable: true, description: "רק בקריאה של מאמר בודד" },
          author: ref("UserSummary"),
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          canEdit: { type: "boolean" },
        },
      },
      CreateArticleRequest: {
        type: "object",
        required: ["title", "summary", "category"],
        properties: {
          title: { type: "string" },
          summary: { type: "string", maxLength: 500 },
          category: { type: "string", enum: [...ARTICLE_CATEGORIES] },
          sourceName: { type: "string", description: "מאמר חיצוני" },
          sourceUrl: { type: "string", description: "מאמר חיצוני" },
          body: { type: "string", description: "מאמר צוות" },
        },
      },
      UpdateArticleRequest: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          category: { type: "string", enum: [...ARTICLE_CATEGORIES] },
          sourceName: { type: "string" },
          sourceUrl: { type: "string" },
          body: { type: "string" },
        },
      },
    },
  },
};
