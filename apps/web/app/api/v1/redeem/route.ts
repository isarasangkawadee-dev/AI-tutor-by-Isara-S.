import { AppError, requireRole, requireSession, withErrorHandling, jsonOk, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

export const POST = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["STUDENT"]);
  await rateLimit(`redeem:${user.id}`, 5, 60 * 1000);

  const body = await readJson<{ code: string }>(req);
  const raw = String(body.code ?? "").trim().toUpperCase();
  if (!raw) throw new AppError("INVALID_CODE");
  const codeHash = hashToken(raw);

  const codes = (await prisma.$queryRaw`
    SELECT "id","status","durationDays","maxUses","useCount","perUserLimit","validFrom","validUntil","planCode"
    FROM "RedeemCode" WHERE "codeHash" = ${codeHash} LIMIT 1`) as unknown as Array<{
    id: string; status: string; durationDays: number; maxUses: number | null; useCount: number;
    perUserLimit: number; validFrom: Date; validUntil: Date; planCode: string;
  }>;
  const code = codes[0];
  const now = new Date();
  if (!code || code.status !== "ACTIVE" || now < code.validFrom || now > code.validUntil)
    throw new AppError("INVALID_CODE");
  if (code.maxUses !== null && code.useCount >= code.maxUses)
    throw new AppError("CODE_EXHAUSTED");

  const userRedemptions = (await prisma.$queryRaw`
    SELECT "id" FROM "RedeemRedemption" WHERE "codeId" = ${code.id}::uuid AND "userId" = ${user.id}::uuid`) as unknown as Array<{ id: string }>;
  if (userRedemptions.length >= code.perUserLimit) throw new AppError("PER_USER_LIMIT");

  const requestId = crypto.randomUUID();
  const users = (await prisma.$queryRaw`
    SELECT "subscriptionExpiresAt" FROM "User" WHERE "id" = ${user.id}::uuid LIMIT 1`) as unknown as Array<{ subscriptionExpiresAt: Date | null }>;
  const u = users[0];
  const base = u.subscriptionExpiresAt && u.subscriptionExpiresAt > now ? u.subscriptionExpiresAt : now;
  const ends = new Date(base.getTime() + code.durationDays * 86400000);

  await prisma.$executeRaw`
    INSERT INTO "RedeemRedemption" ("codeId","userId","requestId","entitlementEndsAt")
    VALUES (${code.id}::uuid, ${user.id}::uuid, ${requestId}::uuid, ${ends}::timestamptz)
    ON CONFLICT ("requestId") DO NOTHING`;

  const [plan] = (await prisma.$queryRaw`
    SELECT "id" FROM "MembershipPlan" WHERE "code" = ${code.planCode}::varchar LIMIT 1`) as unknown as Array<{ id: string }>;

  if (plan) {
    await prisma.$executeRaw`
      UPDATE "User" SET "subscriptionExpiresAt" = GREATEST(COALESCE("subscriptionExpiresAt", now()), now())
      WHERE "id" = ${user.id}::uuid`;
    await prisma.$executeRaw`
      INSERT INTO "UserMembership" ("userId","planId","source","sourceRef","startsAt","endsAt")
      VALUES (${user.id}::uuid, ${plan.id}::uuid, ${"REDEEM_CODE"}::text::"MembershipSource",
              ${code.id}::varchar, now(), ${ends}::timestamptz)
      ON CONFLICT DO NOTHING`;
  }

  await prisma.$executeRaw`
    UPDATE "RedeemCode" SET "useCount" = "useCount" + 1 WHERE "id" = ${code.id}::uuid`;
  await prisma.$executeRaw`
    INSERT INTO "AuditLog" ("actorId","action","resourceType","resourceId","requestId")
    VALUES (${user.id}::uuid, 'REDEEM_CODE_USED', 'redeem_code', ${code.id}::uuid, ${requestId})`;

  return jsonOk({
    redeemed: true,
    entitlementEndsAt: ends.toISOString(),
    planCode: code.planCode,
    idempotent: userRedemptions.length > 0
  });
});
