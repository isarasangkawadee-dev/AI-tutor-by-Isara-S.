import { randomUUID } from "node:crypto";
import { AppError, requireRole, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit, firstRow, notFound } from "@/lib/server";

export const GET = withErrorHandling(async (req) => {
  // history for current user
  const user = await requireSession(req.headers);
  requireRole(user, ["STUDENT"]);
  const url = new URL(req.url);
  const rows = (await prisma.$queryRaw`
    SELECT "id","subject","mode","status","startedAt","submittedAt","score","maxScore","percent"
    FROM "ExamAttempt" WHERE "userId" = ${user.id}::uuid
    ORDER BY "startedAt" DESC LIMIT 50`) as unknown as Array<{
    id: string; subject: string; mode: string; status: string; startedAt: Date;
    submittedAt: Date | null; score: number | null; maxScore: number | null; percent: string | null;
  }>;
  return jsonOk({ items: rows.map((r) => ({ ...r, percent: r.percent ? Number(r.percent) : null })) });
});

export const POST = withErrorHandling(async (req, opts) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["STUDENT"]);
  // /api/v1/exams is a static route: path params are empty and op comes via query string (?op=start|submit).
  // NOTE: Next.js 16 does not pass searchParams in the route context for static routes
  // (only dynamic routes receive it), so we parse the query string from req.url.
  const op = new URL(req.url).searchParams.get("op");

  if (op === "start") {
    await rateLimit(`exam:start:${user.id}`, 10, 60 * 1000);
    const body = await readJson<{ subject: string; mode: "PRACTICE" | "EXAM"; count: number; durationMinutes?: number }>(req);
    const subject = body.subject as string;
    const mode = body.mode ?? "PRACTICE";
    const rawCount = Number(body.count ?? 10);
    if (typeof body.count !== "undefined" && (typeof body.count !== "number" || isNaN(rawCount)))
      throw new AppError("INVALID_COUNT", 400);
    const count = Math.min(Math.max(rawCount, 1), 100);
    if (!["PRACTICE", "EXAM"].includes(mode)) throw new AppError("INVALID_MODE");
    if (!["MATHEMATICS", "SCIENCE", "THAI", "SOCIAL_STUDIES", "ENGLISH"].includes(subject))
      throw new AppError("INVALID_SUBJECT", 400);

    const pool = (await prisma.$queryRaw`
      SELECT "id" FROM "Question" WHERE "status" = ${"PUBLISHED"}::text::"QuestionStatus"
      AND "subject" = ${subject}::text::"Subject" ORDER BY RANDOM() LIMIT ${count}`) as unknown as Array<{ id: string }>;
    if (pool.length < count) throw new AppError("INSUFFICIENT_INVENTORY");

    const expiresAt = mode === "EXAM" ? new Date(Date.now() + (body.durationMinutes ?? 60) * 60000) : null;
    const attempt = (await prisma.$queryRaw`INSERT INTO "ExamAttempt" ("userId","subject","mode","status","expiresAt")
      VALUES (${user.id}::uuid, ${subject}::text::"Subject", ${mode}::varchar, ${"IN_PROGRESS"}::text::"AttemptStatus", ${expiresAt}::timestamptz)
      RETURNING "id","subject","mode","status","expiresAt","startedAt"`) as unknown as Array<{
      id: string; subject: string; mode: string; status: string; expiresAt: Date | null; startedAt: Date;
    }>;
    const a = attempt[0];
    for (let i = 0; i < pool.length; i++) {
      await prisma.$executeRaw`
        INSERT INTO "ExamAttemptQuestion" ("attemptId","questionId","questionVersion","sortOrder")
        VALUES (${a.id}::uuid, ${pool[i].id}::uuid, 1, ${i})
        ON CONFLICT ("attemptId","sortOrder") DO NOTHING`;
    }
    await prisma.$executeRaw`
      INSERT INTO "AuditLog" ("actorId","action","resourceType","resourceId","requestId")
      VALUES (${user.id}::uuid, 'EXAM_STARTED', 'exam_attempt', ${a.id}::uuid, ${`req-${Date.now()}`})`;
    return jsonOk({ attempt: { ...a, questionIds: pool.map((p) => p.id), expiresAt: a.expiresAt } }, { status: 201 });
  }

  if (op === "submit") {
    const body = await readJson<{ attemptId: string }>(req);
    return await submitAttempt(user.id, body.attemptId);
  }

  throw new AppError("ROUTE_NOT_FOUND", 404);
});

async function submitAttempt(userId: string, attemptId: string) {
  await rateLimit(`exam:submit:${userId}`, 10, 60 * 1000);
  const rows = (await prisma.$queryRaw`
    SELECT "id","status","expiresAt" FROM "ExamAttempt"
    WHERE "id" = ${attemptId}::uuid AND "userId" = ${userId}::uuid`) as unknown as Array<{ id: string; status: string; expiresAt: Date | null }>;
  const attempt = rows[0];
  if (!attempt) throw notFound();
  if (attempt.status === "SUBMITTED") return jsonOk({ attempt: { id: attempt.id, status: "SUBMITTED" }, idempotent: true });

  let status: string;
  if (attempt.expiresAt && attempt.expiresAt < new Date()) status = "EXPIRED";
  else status = "SUBMITTED";

  const [answers] = (await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n FROM "AttemptAnswer" WHERE "attemptId" = ${attemptId}::uuid`) as unknown as Array<{ n: number }>;

  const updated = (await prisma.$queryRaw`
    UPDATE "ExamAttempt" SET "status" = ${status}::text::"AttemptStatus",
      "submittedAt" = now(),
      "score" = COALESCE((SELECT COUNT(*)::int FROM "AttemptAnswer" a WHERE a."attemptId" = "ExamAttempt"."id" AND a."isCorrect" = true), 0),
      "maxScore" = COALESCE((SELECT COUNT(*)::int FROM "ExamAttemptQuestion" q WHERE q."attemptId" = "ExamAttempt"."id"), 1),
      "percent" = COALESCE((
        SELECT ROUND(COUNT(*) FILTER (WHERE a."isCorrect")::numeric / GREATEST((SELECT COUNT(*)::int FROM "ExamAttemptQuestion" q WHERE q."attemptId" = "ExamAttempt"."id"), 1) * 100, 2)
        FROM "AttemptAnswer" a WHERE a."attemptId" = "ExamAttempt"."id"), 0)
    WHERE "id" = ${attemptId}::uuid AND "status" = ${"IN_PROGRESS"}::text::"AttemptStatus"
    RETURNING "id","status","score","maxScore","percent","submittedAt"`) as unknown as Array<{
    id: string; status: string; score: number; maxScore: number; percent: string; submittedAt: Date;
  }>;
  const result = updated[0];
  if (!result) return jsonOk({ attempt: { id: attempt.id, status: attempt.status }, idempotent: true });

  const eventId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "RewardLedger" ("userId","eventId","sourceType","sourceId","reason","points")
    VALUES (${userId}::uuid, ${eventId}::uuid, 'exam', ${result.id}::varchar,
            'EXAM_SUBMITTED', 25 + COALESCE(${result.score}::int, 0) * 10)
    ON CONFLICT ("eventId") DO NOTHING
  `;
  await prisma.$executeRaw`
    UPDATE "User" SET "points" = "points" + (25 + COALESCE(${result.score}::int, 0) * 10)
    WHERE "id" = ${userId}::uuid`;
  await prisma.$executeRaw`
    INSERT INTO "AuditLog" ("actorId","action","resourceType","resourceId","requestId")
    VALUES (${userId}::uuid, 'EXAM_SUBMITTED', 'exam_attempt', ${attemptId}::uuid, ${`req-${Date.now()}`})`;
  return jsonOk({ attempt: { ...result, percent: Number(result.percent) }, idempotent: false });
}

export { firstRow };
