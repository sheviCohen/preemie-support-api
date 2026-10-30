import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { startReminderJob, stopReminderJob } from "./jobs/reminders";
import { getOrCreateGeneralConversation } from "./modules/conversations/general";
import { initRealtime } from "./realtime/socket";
import { bootstrap } from "./seed/bootstrap";
import { seedDemo } from "./seed/demo";

async function main(): Promise<void> {
  await prisma.$connect();
  await getOrCreateGeneralConversation(prisma);

  // אם הוגדרה סיסמת צוות, מוודאים שאנשי הצוות קיימים (בטוח להרצה חוזרת, לא משנה סיסמאות קיימות)
  if (env.SEED_STAFF_PASSWORD) {
    const { created, staffIds } = await bootstrap(prisma, env.SEED_STAFF_PASSWORD);
    if (created > 0) {
      console.log(`נוצרו ${created} אנשי צוות`);
    }

    // נתוני הדגמה (אמהות, מאמרים, לו"ז לשבועות הקרובים). בטוח להרצה חוזרת: מה שקיים לא משתנה,
    // ובכל הפעלה מתמלאים שבועות חדשים שעוד ריקים בלו"ז.
    if (env.SEED_DEMO_DATA && env.SEED_DEMO_PASSWORD) {
      await seedDemo(prisma, env.SEED_DEMO_PASSWORD, staffIds);
      console.log("נתוני הדגמה עודכנו");
    }
  }

  const app = createApp();
  const httpServer = createServer(app);
  const io = initRealtime(httpServer);
  startReminderJob();

  httpServer.listen(env.PORT, () => {
    console.log(`השרת רץ על פורט ${env.PORT}`);
    console.log(`תיעוד API: /api-docs`);
  });

  const shutdown = (signal: string) => {
    console.log(`התקבל ${signal}, סוגר את השרת...`);
    stopReminderJob();
    void io.close(() => {
      httpServer.close(() => {
        void prisma.$disconnect().finally(() => process.exit(0));
      });
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error: unknown) => {
  console.error("הפעלת השרת נכשלה", error);
  process.exit(1);
});
