-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MOTHER', 'STAFF');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('NURSE', 'SOCIAL_WORKER', 'DEVELOPMENTAL_THERAPIST');

-- CreateEnum
CREATE TYPE "ScheduleCategory" AS ENUM ('APPOINTMENT', 'CARE_TASK');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('MEDICAL_CHECKUP', 'WELL_BABY_CLINIC', 'SPEECH_THERAPY', 'PHYSIOTHERAPY', 'SCHEDULED_CHAT', 'STAFF_MEETING', 'OTHER_APPOINTMENT', 'MEDICATION', 'VITAMINS', 'INHALATION', 'FEEDING', 'PHYSIO_EXERCISES', 'OTHER_CARE_TASK');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('GENERAL', 'DIRECT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MESSAGE', 'NEW_CHAT', 'APPOINTMENT_REMINDER', 'CARE_TASK_REMINDER', 'APPOINTMENT_CREATED_BY_STAFF');

-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('FEEDING', 'DEVELOPMENT', 'SLEEP', 'EMOTIONAL_SUPPORT', 'TREATMENTS', 'RIGHTS', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "avatarData" TEXT,
    "staffRole" "StaffRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Baby" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gestationalWeek" INTEGER NOT NULL,
    "birthWeightGrams" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Baby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleItem" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "staffId" INTEGER,
    "withWhom" TEXT,
    "category" "ScheduleCategory" NOT NULL,
    "type" "ScheduleType" NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "seriesId" TEXT,

    CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "type" "ConversationType" NOT NULL,
    "directKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMember" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "link" TEXT,
    "conversationId" INTEGER,
    "scheduleItemId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" SERIAL NOT NULL,
    "authorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Baby_motherId_key" ON "Baby"("motherId");

-- CreateIndex
CREATE INDEX "ScheduleItem_ownerId_startAt_idx" ON "ScheduleItem"("ownerId", "startAt");

-- CreateIndex
CREATE INDEX "ScheduleItem_staffId_startAt_idx" ON "ScheduleItem"("staffId", "startAt");

-- CreateIndex
CREATE INDEX "ScheduleItem_seriesId_idx" ON "ScheduleItem"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_directKey_key" ON "Conversation"("directKey");

-- CreateIndex
CREATE INDEX "ConversationMember_userId_idx" ON "ConversationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMember_conversationId_userId_key" ON "ConversationMember"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_id_idx" ON "Message"("conversationId", "id");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_conversationId_idx" ON "Notification"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_scheduleItemId_userId_type_key" ON "Notification"("scheduleItemId", "userId", "type");

-- CreateIndex
CREATE INDEX "Article_category_idx" ON "Article"("category");

-- CreateIndex
CREATE INDEX "Article_createdAt_idx" ON "Article"("createdAt");

-- AddForeignKey
ALTER TABLE "Baby" ADD CONSTRAINT "Baby_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "ScheduleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------
-- אילוצי תקינות נוספים (CHECK). Prisma לא מכירה אותם, ולכן הם נכתבים כאן ידנית.
-- ----------------------------------------------------------------------

-- תפקיד בצוות חובה לאיש צוות ואסור לאמא
ALTER TABLE "User" ADD CONSTRAINT "User_staffRole_matches_role_check"
  CHECK (("role" = 'STAFF' AND "staffRole" IS NOT NULL) OR ("role" = 'MOTHER' AND "staffRole" IS NULL));

-- שבוע לידה בין 22 ל-37, ומשקל לידה חיובי
ALTER TABLE "Baby" ADD CONSTRAINT "Baby_gestationalWeek_range_check" CHECK ("gestationalWeek" BETWEEN 22 AND 37);
ALTER TABLE "Baby" ADD CONSTRAINT "Baby_birthWeightGrams_positive_check" CHECK ("birthWeightGrams" > 0);

-- שיחה פרטית חייבת מפתח שיחה, והשיחה הכללית אסור שיהיה לה
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_directKey_matches_type_check"
  CHECK (("type" = 'DIRECT' AND "directKey" IS NOT NULL) OR ("type" = 'GENERAL' AND "directKey" IS NULL));

-- הודעה לא ריקה ולא ארוכה מ-2000 תווים
ALTER TABLE "Message" ADD CONSTRAINT "Message_content_length_check" CHECK (char_length(btrim("content")) BETWEEN 1 AND 2000);

-- מספר ההודעות בהתראה הוא לפחות 1
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_count_positive_check" CHECK ("count" >= 1);

-- מאמר הוא בדיוק אחד משניים: חיצוני (מקור וקישור, בלי טקסט מלא) או מאמר צוות (טקסט מלא, בלי מקור וקישור)
ALTER TABLE "Article" ADD CONSTRAINT "Article_kind_consistency_check"
  CHECK (
    ("sourceName" IS NOT NULL AND "sourceUrl" IS NOT NULL AND "body" IS NULL)
    OR ("body" IS NOT NULL AND "sourceName" IS NULL AND "sourceUrl" IS NULL)
  );
