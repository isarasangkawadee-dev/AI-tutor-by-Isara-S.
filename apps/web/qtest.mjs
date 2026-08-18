import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@aitutor/db";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Test 1: null param with explicit cast (as in questions route)
try {
  const r1 = await prisma.$queryRaw`
    SELECT "id","subject" FROM "Question"
    WHERE "status" = "PUBLISHED"::"QuestionStatus"
      AND (${null}::text IS NULL OR "subject" = ${null}::text::"Subject")
    LIMIT 5`;
  console.log("T1 (null::text cast): OK rows=", r1.length);
} catch (e) { console.log("T1 FAIL:", e.code, e.message.slice(0, 200)); }

// Test 2: null param without cast
try {
  const r2 = await prisma.$queryRaw`
    SELECT "id","subject" FROM "Question"
    WHERE "status" = "PUBLISHED"::"QuestionStatus"
      AND (${null} IS NULL OR "subject" = ${null})
    LIMIT 5`;
  console.log("T2 (plain null): OK rows=", r2.length);
} catch (e) { console.log("T2 FAIL:", e.code, e.message.slice(0, 200)); }

// Test 3: non-null params with cast
try {
  const r3 = await prisma.$queryRaw`
    SELECT "id","subject" FROM "Question"
    WHERE "status" = "PUBLISHED"::"QuestionStatus"
      AND ("subject" = ${"MATH"}::text::"Subject")
    LIMIT 5`;
  console.log("T3 (cast with value): OK rows=", r3.length, r3[0]?.subject);
} catch (e) { console.log("T3 FAIL:", e.code, e.message.slice(0, 200)); }

// Test 4: CASE-based conditional (no null cast)
try {
  const r4 = await prisma.$queryRaw`
    SELECT "id","subject" FROM "Question"
    WHERE "status" = "PUBLISHED"::"QuestionStatus"
      AND (${null}::text IS NULL OR "subject" = ${"MATH"}::text::"Subject")
    LIMIT 5`;
  console.log("T4 (null cast OR value): OK rows=", r4.length);
} catch (e) { console.log("T4 FAIL:", e.code, e.message.slice(0, 200)); }

// Test 5: COALESCE style
try {
  const r5 = await prisma.$queryRaw`
    SELECT "id","subject" FROM "Question"
    WHERE "status" = "PUBLISHED"::"QuestionStatus"
    LIMIT 5`;
  console.log("T5 (no filter): OK rows=", r5.length);
} catch (e) { console.log("T5 FAIL:", e.code, e.message.slice(0, 200)); }

await prisma.$disconnect();
await pool.end();
