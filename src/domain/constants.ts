// קבועים משותפים לכל הפרויקט. הערכים כאן זהים לערכי ה-Enum בקובץ prisma/schema.prisma.

export const ROLES = ["MOTHER", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES = ["NURSE", "SOCIAL_WORKER", "DEVELOPMENTAL_THERAPIST"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const SCHEDULE_CATEGORIES = ["APPOINTMENT", "CARE_TASK"] as const;
export type ScheduleCategory = (typeof SCHEDULE_CATEGORIES)[number];

export const APPOINTMENT_TYPES = [
  "MEDICAL_CHECKUP",
  "WELL_BABY_CLINIC",
  "SPEECH_THERAPY",
  "PHYSIOTHERAPY",
  "SCHEDULED_CHAT",
  "STAFF_MEETING",
  "OTHER_APPOINTMENT",
] as const;

export const CARE_TASK_TYPES = [
  "MEDICATION",
  "VITAMINS",
  "INHALATION",
  "FEEDING",
  "PHYSIO_EXERCISES",
  "OTHER_CARE_TASK",
] as const;

export const SCHEDULE_TYPES = [...APPOINTMENT_TYPES, ...CARE_TASK_TYPES] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

/** סוגי הפגישות שאיש צוות יכול לקבוע לאמא */
export const STAFF_BOOKABLE_TYPES = ["SCHEDULED_CHAT", "STAFF_MEETING"] as const;

export function typesForCategory(category: ScheduleCategory): readonly ScheduleType[] {
  return category === "APPOINTMENT" ? APPOINTMENT_TYPES : CARE_TASK_TYPES;
}

export const RECURRENCE_UNITS = ["DAY", "WEEK", "MONTH"] as const;
export type RecurrenceUnit = (typeof RECURRENCE_UNITS)[number];

export const SERIES_SCOPES = ["single", "series"] as const;
export type SeriesScope = (typeof SERIES_SCOPES)[number];

/** מספר הפריטים המרבי בסדרה קבועה אחת */
export const MAX_SERIES_ITEMS = 365;

/** אזור הזמן שלפיו נחשבות סדרות קבועות (שעון קיץ וחורף), אם הלקוח לא שלח אחר */
export const DEFAULT_TIME_ZONE = "Asia/Jerusalem";

export const CONVERSATION_TYPES = ["GENERAL", "DIRECT"] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "NEW_MESSAGE",
  "NEW_CHAT",
  "APPOINTMENT_REMINDER",
  "CARE_TASK_REMINDER",
  "APPOINTMENT_CREATED_BY_STAFF",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ARTICLE_CATEGORIES = [
  "FEEDING",
  "DEVELOPMENT",
  "SLEEP",
  "EMOTIONAL_SUPPORT",
  "TREATMENTS",
  "RIGHTS",
  "OTHER",
] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

/** גבולות של שדות */
export const LIMITS = {
  avatarMaxBytes: 200 * 1024,
  messageMaxLength: 2000,
  articleSummaryMaxLength: 500,
  articleBodyMaxLength: 20000,
  gestationalWeekMin: 22,
  gestationalWeekMax: 37,
} as const;
