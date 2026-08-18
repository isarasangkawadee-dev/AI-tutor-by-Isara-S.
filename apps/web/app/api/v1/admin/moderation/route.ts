import { requireRole, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["ADMIN"]);
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "reports";

  if (scope === "reports") {
    const rows = (await prisma.$queryRaw`
      SELECT "id","reporterId","entityType","entityId","reason","status","createdAt"
      FROM "CommunityReport" ORDER BY "createdAt" DESC LIMIT 100`) as unknown as Array<{
      id: string; reporterId: string; entityType: string; entityId: string;
      reason: string; status: string; createdAt: Date;
    }>;
    return jsonOk({ items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
  }

  if (scope === "audit") {
    const rows = (await prisma.$queryRaw`
      SELECT "id","actorId","action","resourceType","resourceId","ipHash","createdAt"
      FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 100`) as unknown as Array<{
      id: string; actorId: string; action: string; resourceType: string;
      resourceId: string; ipHash: string | null; createdAt: Date;
    }>;
    return jsonOk({ items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
  }

  return jsonOk({ items: [] });
});

export const POST = withErrorHandling(async (req) => {
  const actor = await requireSession(req.headers);
  requireRole(actor, ["ADMIN"]);
  await rateLimit(`admin:mod:${actor.id}`, 30, 60 * 1000);
  const body = await readJson<{
    action: "resolveReport" | "hidePost" | "hideAnswer" | "restorePost" | "deletePost";
    reportId?: string; postId?: string; answerId?: string;
  }>(req);

  if (body.action === "resolveReport" && body.reportId) {
    await prisma.$executeRaw`UPDATE "CommunityReport" SET "status" = ${"RESOLVED"}::text::"ReportStatus",
      "resolvedAt" = now() WHERE "id" = ${body.reportId}::uuid`;
  } else if (body.action === "hidePost" && body.postId) {
    await prisma.$executeRaw`UPDATE "CommunityPost" SET "moderationStatus" = ${"HIDDEN"}::text::"ModerationStatus"
      WHERE "id" = ${body.postId}::uuid`;
  } else if (body.action === "restorePost" && body.postId) {
    await prisma.$executeRaw`UPDATE "CommunityPost" SET "moderationStatus" = ${"VISIBLE"}::text::"ModerationStatus"
      WHERE "id" = ${body.postId}::uuid`;
  } else if (body.action === "deletePost" && body.postId) {
    await prisma.$executeRaw`UPDATE "CommunityPost" SET "deletedAt" = now() WHERE "id" = ${body.postId}::uuid`;
  } else if (body.action === "hideAnswer" && body.answerId) {
    await prisma.$executeRaw`UPDATE "CommunityAnswer" SET "moderationStatus" = ${"HIDDEN"}::text::"ModerationStatus"
      WHERE "id" = ${body.answerId}::uuid`;
  } else {
    throw new Error("INVALID_ACTION");
  }

  await prisma.$executeRaw`
    INSERT INTO "AuditLog" ("actorId","action","resourceType","resourceId","requestId")
    VALUES (${actor.id}::uuid, 'ADMIN_MODERATION', 'community',
            ${body.reportId ?? body.postId ?? body.answerId ?? ""}::varchar, ${`req-${Date.now()}`})`;
  return jsonOk({ moderated: true });
});
