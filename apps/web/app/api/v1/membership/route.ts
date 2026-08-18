import { requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);

  const [me] = (await prisma.$queryRaw`
    SELECT "subscriptionExpiresAt" FROM "User" WHERE "id" = ${user.id}::uuid LIMIT 1`) as unknown as Array<{
    subscriptionExpiresAt: Date | null;
  }>;

  const plans = (await prisma.$queryRaw`
    SELECT "id","code","name","active" FROM "MembershipPlan" WHERE "active" = true
    ORDER BY "createdAt" LIMIT 20`) as unknown as Array<{ id: string; code: string; name: string; active: boolean }>;

  const activeMemberships = (await prisma.$queryRaw`
    SELECT "id","planId","source","startsAt","endsAt"
    FROM "UserMembership" WHERE "userId" = ${user.id}::uuid
    AND "endsAt" > now() ORDER BY "endsAt" DESC LIMIT 10`) as unknown as Array<{
    id: string; planId: string; source: string; startsAt: Date; endsAt: Date;
  }>;

  return jsonOk({
    plans: plans.map((p) => ({ id: p.id, code: p.code, name: p.name })),
    myMembership: {
      isPremium: !!me?.subscriptionExpiresAt && me.subscriptionExpiresAt > new Date(),
      expiresAt: me?.subscriptionExpiresAt?.toISOString() ?? null,
      activeMemberships: activeMemberships.map((m) => ({
        ...m,
        startsAt: m.startsAt.toISOString(),
        endsAt: m.endsAt.toISOString()
      }))
    }
  });
});
