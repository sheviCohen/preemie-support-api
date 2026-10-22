import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // בדיקות האינטגרציה חולקות מסד נתונים אחד, ולכן הקבצים רצים בזה אחר זה
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
