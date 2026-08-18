import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@aitutor/db";
const adapter = new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const prisma = new PrismaClient({ adapter });
const aid = process.argv[2], qid = process.argv[3];
const answerJson = JSON.stringify({ choiceIds: ["c1"] });
try {
  await prisma.$executeRaw`
    INSERT INTO "AttemptAnswer" ("attemptId","questionId","answer","clientRevision")
    VALUES (${aid}::uuid, ${qid}::uuid, ${answerJson}::jsonb, 1)
    ON CONFLICT ("attemptId","questionId") DO UPDATE SET "answer" = ${answerJson}::jsonb,
        "clientRevision" = "AttemptAnswer"."clientRevision" + 1, "answeredAt" = now()`;
  console.log("OK1");
  // แบบ route จริง (ไม่มี ON CONFLICT — route ใช ้ check แล้ว INSERT แยก)
  await prisma.$executeRaw`DELETE FROM "AttemptAnswer" WHERE "attemptId" = ${aid}::uuid`;
  const [check] = await prisma.$queryRaw`SELECT "attemptId" FROM "AttemptAnswer" WHERE "attemptId" = ${aid}::uuid AND "questionId" = ${qid}::uuid LIMIT 1`;
  console.log("check:", check ? "exists" : "new");
  await prisma.$executeRaw`INSERT INTO "AttemptAnswer" ("attemptId","questionId","answer","clientRevision") VALUES (${aid}::uuid, ${qid}::uuid, ${answerJson}::jsonb, 1)`;
  console.log("OK2");
} catch (e) { console.log("ERR:", e.message); }
process.exit(0);
