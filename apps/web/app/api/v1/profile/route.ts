import { requireSession, withErrorHandling, jsonOk, jsonErr } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  const [me] = (await prisma.$queryRaw`
    SELECT "id","email","displayName","role","status","points","level","grade","school",
           "points","level","subscriptionExpiresAt","lastLoginAt","createdAt"
    FROM "User" WHERE "id" = ${user.id}::uuid LIMIT 1`) as unknown as Array<{
    id: string; email: string; displayName: string | null; role: string; status: string;
    points: number; level: number; grade: number | null; school: string | null;
    subscriptionExpiresAt: Date | null; lastLoginAt: Date | null; createdAt: Date;
  }>;
  if (!me) return jsonErr({ code: "ACCOUNT_NOT_FOUND", message: "ACCOUNT_NOT_FOUND" }, 404);
  return jsonOk({
    profile: {
      ...me,
      subscriptionExpiresAt: me.subscriptionExpiresAt?.toISOString() ?? null,
      lastLoginAt: me.lastLoginAt?.toISOString() ?? null,
      createdAt: me.createdAt.toISOString()
    }
  });
});

export const PATCH = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  await rateLimit(`profile:${user.id}`, 10, 60 * 1000);
  const body = await readJson<{ displayName?: string; school?: string; grade?: number }>(req);
  const displayName = body.displayName ? String(body.displayName).slice(0, 120) : undefined;
  const school = body.school ? String(body.school).slice(0, 180) : undefined;
  const grade = body.grade !== undefined ? Math.min(Math.max(Math.floor(Number(body.grade) ?? 0), 0), 12) : undefined;

  await prisma.$executeRaw`
    UPDATE "User" SET
      "displayName" = COALESCE(${displayName}, "displayName"),
      "school" = COALESCE(${school}, "school"),
      "grade" = COALESCE(${grade}, "grade")
    WHERE "id" = ${user.id}::uuid`;

  return jsonOk({ updated: true });
});
