import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@aitutor/db";
import { hashToken } from "../../lib/auth.js";
const adapter = new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const prisma = new PrismaClient({ adapter });

const uid = (await prisma.$queryRaw`SELECT "id" FROM "User" WHERE email='student@aitutor-dev.local' LIMIT 1`).at(0).id;

// 1. find published question
const rows = await prisma.$queryRaw`SELECT "id","subject","stem" FROM "Question" WHERE "status" = 'PUBLISHED'::"QuestionStatus" LIMIT 1`;
const q = rows[0];
console.log("q:", q?.id, q?.subject);

// 2. session insert with null subject
const subj = q ? q.subject : null;
const sess = await prisma.$queryRaw`INSERT INTO "TutorSession" ("userId","subject") VALUES (${uid}::uuid, ${subj}) RETURNING "id"`;
console.log("session:", sess[0].id);
const sid = sess[0].id;

// 3. tutor messages
await prisma.$executeRaw`INSERT INTO "TutorMessage" ("sessionId","role","content") VALUES (${sid}::uuid, 'USER', 'ask-about:${q?.id}')`;
await prisma.$executeRaw`INSERT INTO "TutorMessage" ("sessionId","role","content") VALUES (${sid}::uuid, 'ASSISTANT', '{"correct":false,"concept":"x"}')`;
console.log("messages OK");

// 4. usage insert
const rid = crypto.randomUUID();
await prisma.$executeRaw`INSERT INTO "AiTutorUsage" ("requestId","userId","questionId","questionVersion","mode","provider","model","promptVersion","inputTokens","outputTokens","estimatedCost","cacheHit")
  VALUES (${rid}::uuid, ${uid}::uuid, ${q?.id ?? null}::uuid, ${q ? 1 : null}::int, 'TUTOR_CHAT'::varchar, 'builtin'::varchar, 'aitutor-classic'::varchar, 'v1'::varchar, 0, 0, 0, false)
  ON CONFLICT ("requestId") DO NOTHING`;
console.log("usage OK", rid);

// 5. redeem idempotent second call
const codeHash = hashToken("AITUTOR-2026-DEMO");
const codes = await prisma.$queryRaw`SELECT "id","status","durationDays","maxUses","useCount","perUserLimit","validFrom","validUntil","planCode" FROM "RedeemCode" WHERE "codeHash" = ${codeHash} LIMIT 1`;
console.log("code:", codes[0]?.id, codes[0]?.status, "useCount:", codes[0]?.useCount);

await prisma.$disconnect();
