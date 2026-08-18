import { requireRole, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["STUDENT", "TEACHER", "ADMIN"]);

  const rows = (await prisma.$queryRaw`
    SELECT "eventId","sourceType","sourceId","reason","points","createdAt"
    FROM "RewardLedger" WHERE "userId" = ${user.id}::uuid
    ORDER BY "createdAt" DESC LIMIT 100`) as unknown as Array<{
    eventId: string; sourceType: string; sourceId: string; reason: string;
    points: number; createdAt: Date;
  }>;
  const total = (await prisma.$queryRaw`
    SELECT COALESCE(SUM("points"),0)::int AS total, COALESCE(SUM(CASE WHEN "points" < 0 THEN -"points" ELSE 0 END),0)::int AS spent
    FROM "RewardLedger" WHERE "userId" = ${user.id}::uuid`) as unknown as Array<{ total: number; spent: number }>;

  const [me] = (await prisma.$queryRaw`
    SELECT "points","level" FROM "User" WHERE "id" = ${user.id}::uuid LIMIT 1`) as unknown as Array<{ points: number; level: number }>;

  return jsonOk({
    items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    balance: me?.points ?? 0,
    level: me?.level ?? 1,
    summary: { total: total[0]?.total ?? 0, spent: total[0]?.spent ?? 0 }
  });
});
