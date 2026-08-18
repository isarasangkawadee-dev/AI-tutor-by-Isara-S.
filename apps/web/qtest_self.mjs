import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@aitutor/db";
const adapter = new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const prisma = new PrismaClient({ adapter });
const aid = process.argv[2], qid = process.argv[3];
try {
  const rows = await prisma.$queryRaw`SELECT "id","questionId" FROM "AttemptAnswer" WHERE "attemptId" = ${aid}::uuid AND "questionId" = ${qid}::uuid LIMIT 1`;
  console.log("T1 OK:", rows.length);
  // เทียบ SELECT ที่ work ใน questions route
  const q = await prisma.$queryRaw`SELECT "id","stem" FROM "Question" LIMIT 1`;
  console.log("T2 OK:", q.length);
} catch (e) { console.log("ERR:", e.message); }
process.exit(0);
