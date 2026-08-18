import { AppError, requireRole, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["ADMIN"]);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "PENDING_REVIEW";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
  const rows = (await prisma.$queryRaw`
    SELECT "id", "subject", "grade", "difficulty", "type", "status", "reviewStatus", "stem",
           "version", "authorId", "createdAt"
    FROM "Question" WHERE "reviewStatus" = ${status}
    ORDER BY "createdAt" DESC LIMIT ${limit}`) as unknown as Array<{
    id: string; subject: string; grade: number; difficulty: string; type: string;
    status: string; reviewStatus: string; stem: string; version: number; authorId: string; createdAt: Date;
  }>;
  return jsonOk({ items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
});

export const PATCH = withErrorHandling(async (req) => {
  const actor = await requireSession(req.headers);
  requireRole(actor, ["ADMIN"]);
  await rateLimit(`admin:question:${actor.id}`, 60, 60 * 1000);
  const body = await readJson<{ questionId: string; action: "publish" | "reject" }>(req);
  if (body.action !== "publish" && body.action !== "reject") throw new AppError("INVALID_ACTION");

  const rows = (await prisma.$queryRaw`
    UPDATE "Question" SET "reviewStatus" = ${body.action === "publish" ? "APPROVED" : "REJECTED"}::varchar,
      "status" = ${body.action === "publish" ? "PUBLISHED" : "ARCHIVED"}::text::"QuestionStatus"
    WHERE "id" = ${body.questionId}::uuid
    RETURNING "id", "status", "reviewStatus"`) as unknown as Array<{ id: string; status: string; reviewStatus: string }>;
  if (rows.length === 0) throw new AppError("QUESTION_NOT_FOUND");
  await prisma.$executeRaw`
    INSERT INTO "AuditLog" ("actorId", "action", "resourceType", "resourceId", "requestId")
    VALUES (${actor.id}::uuid, ${body.action === "publish" ? "QUESTION_PUBLISHED" : "QUESTION_REJECTED"}::varchar,
            'question', ${body.questionId}::uuid, ${`req-${Date.now()}`})`;
  return jsonOk(rows[0]);
});
