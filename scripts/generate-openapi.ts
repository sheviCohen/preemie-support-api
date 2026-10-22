import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openApiDocument } from "../src/docs/openapi";

const target = resolve(process.cwd(), "openapi.json");
writeFileSync(target, `${JSON.stringify(openApiDocument, null, 2)}\n`, "utf8");
console.log(`נוצר ${target}`);
