import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@aitutor/db";
const adapter = new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const prisma = new PrismaClient({ adapter });
const uid = (await prisma.$queryRaw`SELECT "id" FROM "User" LIMIT 1`).at(0).id;
const subj = null;
try {
  const r = await prisma.$queryRaw`INSERT INTO "TutorSession" ("userId","subject") VALUES (${uid}::uuid, ${subj}::text::"Subject") RETURNING "id"`;
  console.log("null::text::Subject: OK", r[0].id);
} catch (e) { console.log("FAIL:", e.code, e.message.slice(0,120)); }
try {
  const r = await prisma.$queryRaw`INSERT INTO "TutorSession" ("userId","subject") VALUES (${uid}::uuid, ${subj}) RETURNING "id"`;
  console.log("bare null Subject: OK", r[0].id);
} catch (e) { console.log("FAIL:", e.code, e.message.slice(0,120)); }
await prisma.$disconnect();
