// Apply pending Prisma migrations during build (idempotent, runs after generate).
// Skipped when DATABASE_URL is a dummy placeholder (local offline builds).
import "dotenv/config";
import { execSync } from "node:child_process";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost/dummy";

if (/^postgresql:\/\/localhost\/dummy(\?|$)/.test(DATABASE_URL)) {
  console.log("[apply-migrations] Skipping — DATABASE_URL is a dummy placeholder.");
  process.exit(0);
}

if (!DATABASE_URL) {
  console.log("[apply-migrations] Skipping — DATABASE_URL not set.");
  process.exit(0);
}

console.log("[apply-migrations] Applying pending migrations...");
execSync(
  "node ./node_modules/prisma/build/index.js migrate deploy --config packages/db/prisma.config.ts",
  { stdio: "inherit", env: { ...process.env, DATABASE_URL, DB_URL: DATABASE_URL } },
);
console.log("[apply-migrations] Done.");
