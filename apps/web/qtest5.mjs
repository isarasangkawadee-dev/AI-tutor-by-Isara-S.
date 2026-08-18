import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@aitutor/db";
const adapter = new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const prisma = new PrismaClient({ adapter });

// Reproduce exact failing pattern: ternary expression inside interpolation with cast
async function test() {
  const mode = "PRACTICE";
  const expiresAt = mode === "EXAM" ? new Date() : null;
  const uid = (await prisma.$queryRaw`SELECT "id" FROM "User" LIMIT 1`).at(0).id;
  try {
    await prisma.$executeRaw`INSERT INTO "ExamAttempt" ("userId","subject","mode","status","expiresAt")
      VALUES (${uid}::uuid, 'MATHEMATICS'::text::"Subject", 'PRACTICE'::varchar, 'IN_PROGRESS'::"AttemptStatus", ${expiresAt}::timestamptz)
      ON CONFLICT DO NOTHING`;
    console.log("ternary null::timestamptz: OK");
  } catch (e) { console.log("ternary null::timestamptz FAIL:", e.code, e.message.slice(0, 120)); }

  // Without cast when null: use sql helper? test direct
  try {
    const expSql = expiresAt ? pg.types.getTypeParser ? null : null : null; // noop
    await prisma.$executeRaw`INSERT INTO "ExamAttempt" ("userId","subject","mode","status","expiresAt")
      VALUES (${uid}::uuid, 'MATHEMATICS'::text::"Subject", 'PRACTICE'::varchar, 'IN_PROGRESS'::"AttemptStatus", ${expiresAt})
      ON CONFLICT DO NOTHING`;
    console.log("uncast null: OK");
  } catch (e) { console.log("uncast null FAIL:", e.code, e.message.slice(0, 120)); }
}
await test();
await prisma.$disconnect();
