import { AppError, requireRole, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit, notFound } from "@/lib/server";

export const GET = withErrorHandling(async (req, opts) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["STUDENT"]);
  const attemptId = opts.params?.attemptId ?? "";

  const rows = (await prisma.$queryRaw`
    SELECT "id","subject","mode","status","startedAt","expiresAt","submittedAt","score","maxScore","percent"
    FROM "ExamAttempt" WHERE "id" = ${attemptId}::uuid AND "userId" = ${user.id}::uuid`) as unknown as Array<{
    id: string; subject: string; mode: string; status: string; startedAt: Date; expiresAt: Date | null;
    submittedAt: Date | null; score: number | null; maxScore: number | null; percent: string | null;
  }>;
  const attempt = rows[0];
  if (!attempt) throw notFound();

  const qs = (await prisma.$queryRaw`
    SELECT q."id", q."subject", q."grade", q."difficulty", q."stem", q."type", q."version",
           eq."sortOrder" AS "order"
    FROM "ExamAttemptQuestion" eq
    JOIN "Question" q ON q."id" = eq."questionId"
    WHERE eq."attemptId" = ${attemptId}::uuid
    ORDER BY eq."sortOrder"`) as unknown as Array<{
    id: string; subject: string; grade: number; difficulty: string; stem: string;
    type: string; version: number; order: number;
  }>;

  const questions = await Promise.all(qs.map(async (q) => {
    const choices = (await prisma.$queryRaw`
      SELECT "label","content","sortOrder" FROM "QuestionChoice"
      WHERE "questionId" = ${q.id}::uuid ORDER BY "sortOrder"`) as unknown as Array<{ label: string; content: string; sortOrder: number }>;
    const answers = (await prisma.$queryRaw`
      SELECT "answer","clientRevision","answeredAt" FROM "AttemptAnswer"
      WHERE "attemptId" = ${attemptId}::uuid AND "questionId" = ${q.id}::uuid LIMIT 1`) as unknown as Array<{
      answer: { choiceIds?: string[] }; clientRevision: number; answeredAt: Date;
    }>;
    return {
      id: q.id, subject: q.subject, grade: q.grade, difficulty: q.difficulty, stem: q.stem,
      type: q.type, version: q.version, order: q.order,
      choices: choices.map((c) => ({ label: c.label, content: c.content })),
      answered: answers[0] ? { choiceIds: answers[0].answer?.choiceIds ?? [], clientRevision: answers[0].clientRevision } : null
    };
  }));

  const a = {
    ...attempt,
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    percent: attempt.percent ? Number(attempt.percent) : null
  };
  return jsonOk({ attempt: a, questions });
});

export const POST = withErrorHandling(async (req, opts) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["STUDENT"]);
  const attemptId = opts.params?.attemptId ?? "";
  const body = await readJson<{ questionId: string; choiceIds: string[]; clientRevision?: number }>(req);

  await rateLimit(`answer:${user.id}`, 120, 60 * 1000);

  const rows = (await prisma.$queryRaw`
    SELECT "status" FROM "ExamAttempt" WHERE "id" = ${attemptId}::uuid AND "userId" = ${user.id}::uuid LIMIT 1`) as unknown as Array<{ status: string }>;
  const attempt = rows[0];
  if (!attempt) throw notFound();
  if (attempt.status === "SUBMITTED") throw new AppError("ALREADY_SUBMITTED", 409);

  const qRows = (await prisma.$queryRaw`
    SELECT 1 AS "found" FROM "ExamAttemptQuestion" WHERE "attemptId" = ${attemptId}::uuid AND "questionId" = ${body.questionId}::uuid LIMIT 1`) as unknown as Array<{ found: number }>;
  if (!qRows[0]) throw new AppError("QUESTION_NOT_IN_ATTEMPT", 400);

  const [check] = (await prisma.$queryRaw`
    SELECT "attemptId" FROM "AttemptAnswer" WHERE "attemptId" = ${attemptId}::uuid AND "questionId" = ${body.questionId}::uuid LIMIT 1`) as unknown as Array<{ attemptId: string }>;

  const answerJson = JSON.stringify({ choiceIds: body.choiceIds });
  if (check) {
    await prisma.$executeRaw`
      UPDATE "AttemptAnswer" SET "answer" = ${answerJson}::jsonb,
        "clientRevision" = "clientRevision" + 1, "answeredAt" = now()
      WHERE "attemptId" = ${attemptId}::uuid AND "questionId" = ${body.questionId}::uuid`;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "AttemptAnswer" ("attemptId","questionId","answer","clientRevision")
      VALUES (${attemptId}::uuid, ${body.questionId}::uuid, ${answerJson}::jsonb, 1)`;
  }

  const self = (await prisma.$queryRaw`
    SELECT "id","questionId" FROM "AttemptAnswer"
    WHERE "attemptId" = ${attemptId}::uuid AND "questionId" = ${body.questionId}::uuid LIMIT 1`) as unknown as Array<{ id: string; questionId: string }>;
  return jsonOk({ saved: true, answerId: self[0]?.id ?? null });
});
