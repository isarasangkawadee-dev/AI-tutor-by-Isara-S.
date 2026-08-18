import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@aitutor/db";
const adapter = new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const prisma = new PrismaClient({ adapter });
const subject = null;
const grade = null;
const difficulty = null;
const cursor = null;
const limit = 21;
// Exact query from questions route:
try {
  const rows = await prisma.$queryRaw`
    SELECT "id","subject","grade","difficulty","status","stem","version","createdAt"
    FROM "Question"
    WHERE "status" = "PUBLISHED"::"QuestionStatus"
      AND (${subject}::text IS NULL OR "subject" = ${subject}::text::"Subject")
      AND (${grade}::int IS NULL OR "grade" = ${grade}::int)
      AND (${difficulty}::text IS NULL OR "difficulty" = ${difficulty}::text::"Difficulty")
      AND (${cursor}::uuid IS NULL OR "createdAt" < (SELECT "createdAt" FROM "Question" WHERE "id" = ${cursor}::uuid))
    ORDER BY "createdAt" DESC
    LIMIT ${limit}`;
  console.log("EXACT Q FAIL — should not reach");
} catch (e) { console.log("EXACT Q FAIL:", e.code, e.message.slice(0,150)); }
// Fix A: quoted literal
try {
  const rows = await prisma.$queryRaw`
    SELECT "id","subject" FROM "Question"
    WHERE "status" = 'PUBLISHED'::"QuestionStatus"
      AND (${subject}::text IS NULL OR "subject" = ${subject}::text::"Subject")
    LIMIT ${limit}`;
  console.log("FIX A (quoted status): OK rows=", rows.length);
} catch (e) { console.log("FIX A FAIL:", e.code, e.message.slice(0,150)); }
// Fix B: param for status
try {
  const rows = await prisma.$queryRaw`
    SELECT "id","subject" FROM "Question"
    WHERE "status" = ${"PUBLISHED"}::text::"QuestionStatus"
      AND (${subject}::text IS NULL OR "subject" = ${subject}::text::"Subject")
    LIMIT ${limit}`;
  console.log("FIX B (param status): OK rows=", rows.length);
} catch (e) { console.log("FIX B FAIL:", e.code, e.message.slice(0,150)); }
await prisma.$disconnect();
