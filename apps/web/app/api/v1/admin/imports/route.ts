import { createHash } from "node:crypto";
import { AppError, requireRole, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["ADMIN"]);
  const rows = (await prisma.$queryRaw`
    SELECT "id","filename","mimeType","status","totalItems","processedItems","error","createdAt"
    FROM "ImportJob" ORDER BY "createdAt" DESC LIMIT 50`) as unknown as Array<{
    id: string; filename: string; mimeType: string; status: string; totalItems: number | null;
    processedItems: number; error: string | null; createdAt: Date;
  }>;
  return jsonOk({
    items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
  });
});

export const POST = withErrorHandling(async (req) => {
  const actor = await requireSession(req.headers);
  requireRole(actor, ["ADMIN"]);
  await rateLimit(`admin:import:${actor.id}`, 5, 60 * 1000);
  const body = await readJson<{
    questions: Array<{ subject: string; grade: number; difficulty: string; stem: string; choices: string[]; correct: number[]; explanation?: string }>;
    copyrightAttested: boolean;
  }>(req);

  if (!body.copyrightAttested) throw new AppError("COPYRIGHT_ATTESTATION_REQUIRED", 412);
  const rows = body.questions ?? [];
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 1000) throw new AppError("INVALID_IMPORT");

  const checksum = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  const job = (await prisma.$queryRaw`
    INSERT INTO "ImportJob" ("filename","mimeType","checksum","copyrightAttested","status","createdById","totalItems","processedItems")
    VALUES ('api-import.json'::varchar, 'application/json'::varchar, ${checksum}::varchar,
            true, ${"RUNNING"}::varchar, ${actor.id}::uuid, ${rows.length}, 0)
    RETURNING "id"`) as unknown as Array<{ id: string }>;
  const jobId = job[0].id;

  let processed = 0;
  let failed = 0;
  for (const r of rows) {
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
      processed++;
    } catch {
      failed++;
    }
  }

  await prisma.$executeRaw`
    UPDATE "ImportJob" SET "status" = ${failed > 0 ? "PARTIAL_FAILURE" : "COMPLETED"}::varchar,
      "processedItems" = ${processed} WHERE "id" = ${jobId}::uuid`;
  await prisma.$executeRaw`
    INSERT INTO "AuditLog" ("actorId","action","resourceType","resourceId","requestId")
    VALUES (${actor.id}::uuid, 'IMPORT_COMPLETED', 'import_job', ${jobId}::uuid, ${`req-${Date.now()}`})`;
  return jsonOk({ job: { id: jobId, processed, failed, status: failed > 0 ? "PARTIAL_FAILURE" : "COMPLETED" } });
});
