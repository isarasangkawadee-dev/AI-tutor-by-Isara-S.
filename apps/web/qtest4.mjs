import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@aitutor/db";
const adapter = new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const prisma = new PrismaClient({ adapter });
try {
  const expires = null;
  await prisma.$executeRaw`INSERT INTO "ExamAttempt" ("userId","subject","mode","status","expiresAt") VALUES ('${await prisma.$queryRaw`SELECT "id" FROM "User" LIMIT 1`.then(r=>r[0].id)}'::uuid, 'MATH'::text::"Subject", 'PRACTICE'::varchar, 'IN_PROGRESS'::"AttemptStatus", ${expires}::timestamptz) ON CONFLICT DO NOTHING`;
  console.log("null::timestamptz in VALUES: OK");
} catch (e) { console.log("FAIL:", e.code, e.message.slice(0,120)); }
try {
  const qid = null;
  const ver = null;
  const rid = crypto.randomUUID();
  await prisma.$executeRaw`INSERT INTO "AiTutorUsage" ("requestId","userId","questionId","questionVersion","mode","provider","model","promptVersion","inputTokens","outputTokens","estimatedCost","cacheHit") VALUES (${rid}::uuid, (SELECT "id" FROM "User" LIMIT 1), ${qid}::uuid, ${ver}::int, 'TUTOR_CHAT'::varchar, 'builtin'::varchar, 'aitutor-classic'::varchar, 'v1'::varchar, 0, 0, 0, false) ON CONFLICT ("requestId") DO NOTHING`;
  console.log("null::uuid / null::int in VALUES: OK");
} catch (e) { console.log("FAIL:", e.code, e.message.slice(0,120)); }
await prisma.$disconnect();
