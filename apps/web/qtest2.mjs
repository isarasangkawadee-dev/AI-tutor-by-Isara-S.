import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@aitutor/db";
const adapter = new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const prisma = new PrismaClient({ adapter });
try {
  const r = await prisma.$queryRaw`SELECT "id","subject","status" FROM "Question" WHERE "status" = 'PUBLISHED' LIMIT 5`;
  console.log("A (quoted literal in template): OK rows=", r.length, r[0]?.subject, r[0]?.status);
} catch (e) { console.log("A FAIL:", e.code, e.message.slice(0,150)); }
try {
  const r = await prisma.$queryRaw`SELECT "id" FROM "Question" WHERE "status" = ${"PUBLISHED"}`;
  console.log("B (param uncast): OK rows=", r.length);
} catch (e) { console.log("B FAIL:", e.code, e.message.slice(0,150)); }
try {
  const r = await prisma.$queryRaw`SELECT "id" FROM "Question" WHERE "status" = ${"PUBLISHED"}::"QuestionStatus" LIMIT 5`;
  console.log("C (param with enum cast): OK rows=", r.length);
} catch (e) { console.log("C FAIL:", e.code, e.message.slice(0,150)); }
try {
  const r = await prisma.$queryRaw`SELECT "id" FROM "Question" WHERE "status" = ${"PUBLISHED"}::text::"QuestionStatus" LIMIT 5`;
  console.log("D (param text cast then enum): OK rows=", r.length);
} catch (e) { console.log("D FAIL:", e.code, e.message.slice(0,150)); }
try {
  const r = await prisma.$queryRaw`SELECT "id" FROM "Question" WHERE "status" = 'PUBLISHED'::"QuestionStatus" LIMIT 5`;
  console.log("E (literal enum cast): OK rows=", r.length);
} catch (e) { console.log("E FAIL:", e.code, e.message.slice(0,150)); }
try {
  const r = await prisma.$queryRaw`SELECT "id" FROM "Question" WHERE "status" = ${null} AND 1=0 LIMIT 1`;
  console.log("F (null param no cast): OK rows=", r.length);
} catch (e) { console.log("F FAIL:", e.code, e.message.slice(0,150)); }
try {
  const r = await prisma.$queryRaw`SELECT "id" FROM "Question" WHERE ${null}::text IS NULL LIMIT 1`;
  console.log("G (null cast): OK rows=", r.length);
} catch (e) { console.log("G FAIL:", e.code, e.message.slice(0,150)); }
await prisma.$disconnect();
