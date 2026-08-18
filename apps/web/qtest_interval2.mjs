const { PrismaPg } = await import("@prisma/adapter-pg");
const { PrismaClient } = await import("@aitutor/db");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
try {
  const r = await prisma.$queryRaw`SELECT (now() + (${30} * interval '1 day'))::timestamptz AS v`;
  console.log("OK1", r[0].v);
} catch (e) { console.log("ERR1:", e.code, e.message); }
try {
  const r = await prisma.$queryRaw`SELECT (now() + (${30} * interval ${"1 day"}))::timestamptz AS v`;
  console.log("OK2", r[0].v);
} catch (e) { console.log("ERR2:", e.code, e.message); }
