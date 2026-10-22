import type {
  ArticleCategory,
  RecurrenceUnit,
  ScheduleType,
  StaffRole,
} from "./constants";

// שמות בעברית להצגה בהתראות. ה-React משתמש בהם דרך המסמך FRONTEND-API-GUIDE.md.

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  MEDICAL_CHECKUP: "ביקורת רפואית",
  WELL_BABY_CLINIC: "טיפת חלב",
  SPEECH_THERAPY: "קלינאית תקשורת",
  PHYSIOTHERAPY: "פיזיותרפיה",
  SCHEDULED_CHAT: "צ'אט מתוזמן עם צוות",
  STAFF_MEETING: "פגישה עם צוות",
  OTHER_APPOINTMENT: "תור אחר",
  MEDICATION: "תרופה",
  VITAMINS: "ויטמינים",
  INHALATION: "אינהלציה",
  FEEDING: "האכלה",
  PHYSIO_EXERCISES: "תרגילי פיזיותרפיה",
  OTHER_CARE_TASK: "משימת טיפול אחרת",
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  NURSE: "אחות",
  SOCIAL_WORKER: "עובדת סוציאלית",
  DEVELOPMENTAL_THERAPIST: "מטפלת התפתחותית",
};

export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  FEEDING: "האכלה",
  DEVELOPMENT: "התפתחות",
  SLEEP: "שינה",
  EMOTIONAL_SUPPORT: "רגשות ותמיכה לאמא",
  TREATMENTS: "טיפולים ומעקב",
  RIGHTS: "זכויות והטבות",
  OTHER: "אחר",
};

export const RECURRENCE_UNIT_LABELS: Record<RecurrenceUnit, string> = {
  DAY: "יום",
  WEEK: "שבוע",
  MONTH: "חודש",
};
