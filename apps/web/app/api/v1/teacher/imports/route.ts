import { createHash } from "node:crypto";
import { AppError, requireRole, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["TEACHER", "ADMIN"]);

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);

  const rows = (await prisma.$queryRaw`
    SELECT "id","subject","grade","difficulty","type","status","reviewStatus","stem","version","authorId","createdAt"
    FROM "Question" WHERE "authorId" = ${user.id}::uuid
    ORDER BY "createdAt" DESC LIMIT ${limit}`) as unknown as Array<{
    id: string; subject: string; grade: number; difficulty: string; type: string;
    status: string; reviewStatus: string; stem: string; version: number;
    authorId: string; createdAt: Date;
  }>;

  return jsonOk({
    items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
  });
});

export const POST = withErrorHandling(async (req) => {
  const actor = await requireSession(req.headers);
  requireRole(actor, ["TEACHER", "ADMIN"]);
  await rateLimit(`teacher:import:${actor.id}`, 10, 60 * 1000);

  const body = await readJson<
    Array<{
      subject: string; grade: number; difficulty: string; type?: string;
      stem: string; choices: string[]; correct: number[]; explanation?: string;
    }>
  >(req);

  const rows = Array.isArray(body) ? body : [];

  // Also accept { questions: [...] } format
  const data = body as unknown as { questions?: Array<{ subject: string; grade: number; difficulty: string; stem: string; choices: string[]; correct: number[]; explanation?: string }> };
  const finalRows = rows.length > 0 ? rows : (data.questions ?? []);
  const questionRows = finalRows;
  if (!Array.isArray(questionRows) || questionRows.length === 0 || questionRows.length > 500) throw new AppError("INVALID_IMPORT");

  let processed = 0;
  let failed = 0;
  const createdIds: string[] = [];

  for (const r of questionRows) {
    try {
      const fingerprint = createHash("sha256")
        .update(JSON.stringify([r.subject, r.grade, r.stem]))
        .digest("hex");

      const [dup] = (await prisma.$queryRaw`
        SELECT "id" FROM "Question" WHERE "fingerprint" = ${fingerprint} LIMIT 1`) as unknown as Array<{ id: string }>;
      if (dup) { processed++; continue; }

      const created = (await prisma.$queryRaw`
        INSERT INTO "Question" ("subject","grade","difficulty","type","status","reviewStatus","stem",
                                "explanation","correctAnswer","version","authorId","fingerprint")
        VALUES (${r.subject}::text::"Subject", ${r.grade}, ${r.difficulty}::text::"Difficulty",
                ${"SINGLE_CHOICE"}::text::"QuestionType", ${"PUBLISHED"}::text::"QuestionStatus", ${"APPROVED"}::varchar,
                ${r.stem}, ${r.explanation ?? null},
                ${JSON.stringify({ choiceIds: r.correct.map((i) => `c${i}`) })}::jsonb, 1,
                ${actor.id}::uuid, ${fingerprint})
        RETURNING "id"`) as unknown as Array<{ id: string }>;

      for (let i = 0; i < r.choices.length; i++) {
        await prisma.$executeRaw`
          INSERT INTO "QuestionChoice" ("questionId","label","content","isCorrect","sortOrder")
          VALUES (${created[0].id}::uuid, ${`c${i}`}::varchar, ${r.choices[i]}::text, ${r.correct.includes(i)}, ${i})`;
      }
      createdIds.push(created[0].id);
      processed++;
    } catch {
      failed++;
    }
  }

  if (createdIds.length > 0) {
    await prisma.$executeRaw`
      INSERT INTO "AuditLog" ("actorId","action","resourceType","requestId")
      VALUES (${actor.id}::uuid, 'TEACHER_QUESTIONS_IMPORTED'::varchar, 'teacher_import', ${`req-${Date.now()}`})`;
  }

  return jsonOk({ processed, failed, created: createdIds.length });
});
