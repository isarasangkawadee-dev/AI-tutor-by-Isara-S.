const { PrismaPg } = await import("@prisma/adapter-pg");
const { PrismaClient } = await import("@aitutor/db");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
try {
  const r = await prisma.$queryRaw`SELECT (now() - interval '1 second')::timestamptz AS v`;
  console.log("OK", r[0].v);
} catch (e) { console.log("ERR:", e.code, e.message); }
