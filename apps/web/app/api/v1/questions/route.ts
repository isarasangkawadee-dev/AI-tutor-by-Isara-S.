import { AppError, requireRole, withErrorHandling, jsonOk, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  const url = new URL(req.url);
  const subject = url.searchParams.get("subject");
  const grade = url.searchParams.get("grade");
  const difficulty = url.searchParams.get("difficulty");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
  const cursor = url.searchParams.get("cursor");

  requireRole(user, ["STUDENT", "TEACHER", "ADMIN"]);

  const rows = (await prisma.$queryRaw`
    SELECT "id","subject","grade","difficulty","status","stem","version","createdAt"
    FROM "Question"
    WHERE "status" = ${"PUBLISHED"}::text::"QuestionStatus"
      AND (${subject}::text IS NULL OR "subject" = ${subject}::text::"Subject")
      AND (${grade}::int IS NULL OR "grade" = ${grade}::int)
      AND (${difficulty}::text IS NULL OR "difficulty" = ${difficulty}::text::"Difficulty")
      AND (${cursor}::uuid IS NULL OR "createdAt" < (SELECT "createdAt" FROM "Question" WHERE "id" = ${cursor}::uuid))
    ORDER BY "createdAt" DESC
    LIMIT ${limit + 1}`) as unknown as Array<{
    id: string; subject: string; grade: number; difficulty: string; status: string;
    stem: string; version: number; createdAt: Date;
  }>;

  const nextCursor = rows.length > limit ? rows[limit].id : null;
  const items = rows.slice(0, limit).map((r) => ({
    id: r.id, subject: r.subject, grade: r.grade, difficulty: r.difficulty,
    stem: r.stem, version: r.version, createdAt: r.createdAt.toISOString()
  }));

  return jsonOk({ items, nextCursor });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["ADMIN", "TEACHER"]);
  const body = await readJsonBody<{
    subject: string; grade: number; difficulty: string; stem: string;
    choices: string[]; correct: number[]; explanation: string; reviewStatus?: string;
  }>(req);
  if (!body.subject || !body.stem || body.choices.length < 2) throw new AppError("INVALID_QUESTION");
  if (body.correct.some((i) => i < 0 || i >= body.choices.length)) throw new AppError("INVALID_ANSWER");
  if (body.grade < 1 || body.grade > 12) throw new AppError("INVALID_GRADE");

  const { createHash } = await import("node:crypto");
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([body.subject, body.grade, body.stem]))
    .digest("hex");

  const [dup] = (await prisma.$queryRaw`
    SELECT "id" FROM "Question" WHERE "fingerprint" = ${fingerprint}`) as unknown as Array<{ id: string }>;
  if (dup) throw new AppError("DUPLICATE_QUESTION");

  const status = user.role === "ADMIN" ? "PUBLISHED" : "DRAFT";
  const created = (await prisma.$queryRaw`
    INSERT INTO "Question"
      ("subject","grade","difficulty","type","status","reviewStatus","stem","explanation",
       "correctAnswer","version","authorId","fingerprint")
    VALUES (${body.subject}::text::"Subject", ${body.grade},
            ${body.difficulty}::text::"Difficulty", ${"SINGLE_CHOICE"}::text::"QuestionType",
            ${status}::text::"QuestionStatus",
            ${user.role === "ADMIN" ? "APPROVED" : "PENDING"},
            ${body.stem}, ${body.explanation ?? null},
            ${JSON.stringify({ choiceIds: body.correct.map((i) => `c${i}`) })}::jsonb, 1,
            ${user.id}::uuid, ${fingerprint})
    RETURNING "id","version","status","reviewStatus","createdAt"`) as unknown as Array<{
    id: string; version: number; status: string; reviewStatus: string; createdAt: Date;
  }>;
  const row = created[0];
  for (let i = 0; i < body.choices.length; i++) {
    await prisma.$executeRaw`
      INSERT INTO "QuestionChoice" ("questionId","label","content","isCorrect","sortOrder")
      VALUES (${row.id}::uuid, ${`c${i}`}, ${body.choices[i]}, ${body.correct.includes(i)}, ${i})`;
  }
  await prisma.$executeRaw`
    INSERT INTO "AuditLog" ("actorId","action","resourceType","resourceId","requestId")
    VALUES (${user.id}::uuid, 'QUESTION_CREATED', 'question', ${row.id}::uuid,
            ${`req-${Date.now()}`})`;
  return jsonOk({ question: { ...row, choices: body.choices, correctIndexes: body.correct } }, { status: 201 });
});

async function readJsonBody<T>(req: Request): Promise<T> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) throw new AppError("JSON_REQUIRED", 415);
  try {
    return (await req.json()) as T;
  } catch {
    throw new AppError("INVALID_JSON", 400);
  }
}
