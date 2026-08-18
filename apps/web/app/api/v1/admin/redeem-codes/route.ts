import { createHash } from "node:crypto";
import { AppError, requireRole, requireSession, withErrorHandling, jsonOk, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

function hashSecret(v: string) {
  return createHash("sha256").update(v.trim().toUpperCase()).digest("hex");
}

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["ADMIN"]);

  const rows = (await prisma.$queryRaw`
    SELECT "id","status","durationDays","maxUses","useCount","perUserLimit","validFrom","validUntil","planCode"
    FROM "RedeemCode" ORDER BY "createdAt" DESC LIMIT 100`) as unknown as Array<{
    id: string; status: string; durationDays: number; maxUses: number | null; useCount: number;
    perUserLimit: number; validFrom: Date; validUntil: Date; planCode: string;
  }>;
  return jsonOk({
    items: rows.map((r) => ({
      ...r,
      validFrom: r.validFrom.toISOString(),
      validUntil: r.validUntil.toISOString()
    }))
  });
});

export const POST = withErrorHandling(async (req) => {
  const actor = await requireSession(req.headers);
  requireRole(actor, ["ADMIN"]);
  await rateLimit(`admin:codes:${actor.id}`, 15, 60 * 1000);
  const body = await readJson<{ code: string; durationDays: number; maxUses: number; perUserLimit?: number; planCode?: string }>(req);
  const code = String(body.code ?? "").trim();
  if (!code || code.length < 6) throw new AppError("INVALID_CODE");
  const durationDays = isNaN(Number(body.durationDays)) ? 30 : Number(body.durationDays);
  const maxUses = isNaN(Number(body.maxUses)) ? 100 : Number(body.maxUses);
  const perUserLimit = isNaN(Number(body.perUserLimit)) ? 1 : Number(body.perUserLimit);
  if (durationDays < 1 || maxUses < 1 || perUserLimit < 1) throw new AppError("INVALID_INPUT", 400);
  if (maxUses > 100000 || durationDays > 3650) throw new AppError("INVALID_INPUT", 400);

  const [existing] = (await prisma.$queryRaw`
    SELECT "id" FROM "RedeemCode" WHERE "codeHash" = ${hashToken(code)} LIMIT 1`) as unknown as Array<{ id: string }>;
  if (existing) throw new AppError("CODE_EXISTS", 409);

  const [plan] = (await prisma.$queryRaw`
    SELECT "code" FROM "MembershipPlan" WHERE "code" = ${(body.planCode ?? "premium")}::varchar LIMIT 1`) as unknown as Array<{ code: string }>;

  const created = (await prisma.$queryRaw`
    INSERT INTO "RedeemCode" ("codeHash","status","durationDays","maxUses","perUserLimit","validFrom","validUntil","planCode")
    VALUES (${hashToken(code)}::varchar, ${"ACTIVE"}::text::"RedeemStatus", ${durationDays},
            ${maxUses}, ${perUserLimit},
            now() - interval '1 second', now() + (${durationDays} * interval '1 day'),
            ${(plan?.code ?? "premium")}::varchar)
    RETURNING "id","durationDays","maxUses","perUserLimit","planCode"`) as unknown as Array<{
    id: string; durationDays: number; maxUses: number | null; perUserLimit: number; planCode: string;
  }>;

  await prisma.$executeRaw`
    INSERT INTO "AuditLog" ("actorId","action","resourceType","resourceId","requestId")
    VALUES (${actor.id}::uuid, 'REDEEM_CODE_CREATED', 'redeem_code', ${created[0].id}::uuid, ${`req-${Date.now()}`})`;

  return jsonOk({ code: created[0] }, { status: 201 });
});
