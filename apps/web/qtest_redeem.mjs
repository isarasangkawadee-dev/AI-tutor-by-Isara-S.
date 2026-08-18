const { PrismaPg } = await import("@prisma/adapter-pg");
const { PrismaClient } = await import("@aitutor/db");
const { createHash } = await import("node:crypto");
const hashToken = (v) => createHash("sha256").update(v).digest("hex");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
try {
  const code = "SMOKE-T-999", days = 7;
  const r = await prisma.$queryRaw`
    INSERT INTO "RedeemCode" ("codeHash","status","durationDays","maxUses","perUserLimit","validFrom","validUntil","planCode")
    VALUES (${hashToken(code)}::varchar, ${"ACTIVE"}::text::"RedeemStatus", ${days},
            100, 1,
            now() - interval '1 second', now() + (${days} * interval '1 day'),
            ${"premium"}::varchar)
    RETURNING "id"`;
  console.log("OK", r[0].id);
} catch (e) { console.log("ERR:", e.code, e.message); }
