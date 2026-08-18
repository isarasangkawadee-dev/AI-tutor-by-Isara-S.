// Simulate what Next.js passes to a route handler: (req, context)
// context = { params, searchParams, ... }
import { POST } from "./.next/standalone/apps/web/.next/server/app/api/v1/exams/route.js";
// simpler: import source via tsx? Instead test the compiled chunk isn't easy.
// Use direct source check: Next.js 15+ route handler context for non-dynamic routes:
// { params: Promise<{}>, searchParams: Promise<URLSearchParams> }
console.log("check via built chunk:");
import fs from "fs";
const src = fs.readFileSync("./.next/standalone/apps/web/.next/server/app/api/v1/exams/route.js", "utf8");
const idx = src.indexOf("opts.params");
console.log(src.slice(Math.max(0, idx - 200), idx + 200));
