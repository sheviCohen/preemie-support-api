// רץ לפני כל קובץ בדיקות: מגדיר משתני סביבה לפני שהשרת נטען.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.REMINDER_JOB_ENABLED = "false";
process.env.NOTIFICATION_BACKLOG_DELAY_MS = "50";
process.env.BCRYPT_ROUNDS = "4";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://unused:unused@localhost:5432/preemie_test_unused";
