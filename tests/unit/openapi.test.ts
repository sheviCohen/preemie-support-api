import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openApiDocument } from "../../src/docs/openapi";

// מוודא שכל נתיב אמיתי בקוד מופיע בתיעוד Swagger, ושאין בתיעוד נתיבים שלא קיימים.

const SRC = join(process.cwd(), "src");

const MOUNTS: { file: string; router: string; prefix: string }[] = [
  { file: "modules/auth/auth.routes.ts", router: "authRouter", prefix: "/api/auth" },
  { file: "modules/profile/profile.routes.ts", router: "profileRouter", prefix: "/api/profile" },
  { file: "modules/users/users.routes.ts", router: "mothersRouter", prefix: "/api/mothers" },
  { file: "modules/users/users.routes.ts", router: "staffRouter", prefix: "/api/staff" },
  { file: "modules/schedule/schedule.routes.ts", router: "scheduleRouter", prefix: "/api/schedule" },
  { file: "modules/conversations/conversations.routes.ts", router: "conversationsRouter", prefix: "/api/conversations" },
  { file: "modules/notifications/notifications.routes.ts", router: "notificationsRouter", prefix: "/api/notifications" },
  { file: "modules/articles/articles.routes.ts", router: "articlesRouter", prefix: "/api/articles" },
  { file: "modules/healthFunds/healthFunds.routes.ts", router: "healthFundsRouter", prefix: "/api/health-funds" },
];

function routesInCode(): string[] {
  const found: string[] = [];
  for (const mount of MOUNTS) {
    const source = readFileSync(join(SRC, mount.file), "utf8");
    const pattern = new RegExp(`${mount.router}\\.(get|post|put|delete)\\(\\s*"([^"]*)"`, "g");
    for (const match of source.matchAll(pattern)) {
      const path = (match[2] ?? "").replace(/:(\w+)/g, "{$1}");
      const full = path === "/" ? mount.prefix : `${mount.prefix}${path}`;
      found.push(`${(match[1] ?? "").toUpperCase()} ${full}`);
    }
  }
  return found;
}

function routesInDocs(): string[] {
  const found: string[] = [];
  const paths = openApiDocument.paths as Record<string, Record<string, unknown>>;
  for (const [path, operations] of Object.entries(paths)) {
    for (const method of Object.keys(operations)) {
      found.push(`${method.toUpperCase()} ${path}`);
    }
  }
  return found;
}

describe("תיעוד OpenAPI", () => {
  it("כולל כל נתיב שקיים בקוד", () => {
    const docs = routesInDocs();
    const code = routesInCode();
    expect(code.length).toBeGreaterThan(20);
    const missing = code.filter((route) => !docs.includes(route));
    expect(missing).toEqual([]);
  });

  it("לא כולל נתיבים שלא קיימים בקוד (חוץ מ-health)", () => {
    const code = routesInCode();
    const extra = routesInDocs().filter((route) => route !== "GET /health" && !code.includes(route));
    expect(extra).toEqual([]);
  });

  it("מגדיר אימות Bearer וכל סכמה מוזכרת קיימת", () => {
    const components = openApiDocument.components as {
      securitySchemes: Record<string, unknown>;
      schemas: Record<string, unknown>;
    };
    expect(components.securitySchemes).toHaveProperty("bearerAuth");
    const text = JSON.stringify(openApiDocument);
    const refs = [...text.matchAll(/#\/components\/schemas\/(\w+)/g)].map((match) => match[1] ?? "");
    const unknown = refs.filter((name) => !(name in components.schemas));
    expect(unknown).toEqual([]);
  });

  it("כל פעולה שדורשת התחברות מסומנת עם security", () => {
    const paths = openApiDocument.paths as Record<string, Record<string, { security?: unknown }>>;
    const open = new Set(["POST /api/auth/register", "POST /api/auth/login", "GET /health"]);
    const unsecured: string[] = [];
    for (const [path, operations] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        const key = `${method.toUpperCase()} ${path}`;
        if (!open.has(key) && !operation.security) {
          unsecured.push(key);
        }
      }
    }
    expect(unsecured).toEqual([]);
  });
});
