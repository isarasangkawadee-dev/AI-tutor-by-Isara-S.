import { requireRole, requireSession, withErrorHandling, jsonOk } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["TEACHER", "ADMIN"]);

  const students = (await prisma.$queryRaw`
    SELECT u."id", u."email", u."displayName", u."points", u."level"
    FROM "TeacherStudentAccess" t
    JOIN "User" u ON u."id" = t."studentId"
    WHERE t."teacherId" = ${user.id}::uuid AND u."status" = ${"ACTIVE"}::text::"UserStatus"
    ORDER BY u."points" DESC`) as unknown as Array<{
    id: string; email: string; displayName: string | null; points: number; level: number;
  }>;

  const stats = (await prisma.$queryRaw`
    SELECT COUNT(*)::int AS attempts, COALESCE(AVG("percent"),0)::numeric(5,2) AS avgPercent
    FROM "ExamAttempt" WHERE "userId" = ANY(
      (SELECT array_agg(t."studentId") FROM "TeacherStudentAccess" t WHERE t."teacherId" = ${user.id}::uuid)::uuid[]
    ) AND "status" = ${"SUBMITTED"}::text::"AttemptStatus"`) as unknown as Array<{ attempts: number; avgPercent: string }>;

  return jsonOk({
    students: students.map((s) => ({ ...s, displayName: s.displayName ?? s.email.split("@")[0] })),
    stats: { attempts: stats[0]?.attempts ?? 0, avgPercent: stats[0]?.avgPercent ? Number(stats[0].avgPercent) : 0 }
  });
});

export const POST = withErrorHandling(async (req) => {
  const actor = await requireSession(req.headers);
  requireRole(actor, ["TEACHER", "ADMIN"]);
  await rateLimit(`teacher:${actor.id}`, 30, 60 * 1000);
  const body = await readJson<{ action: string; studentEmail?: string; studentId?: string }>(req);

  if (body.action === "grant") {
    const email = String(body.studentEmail ?? "").trim().toLowerCase();
    if (!email) throw new Error("INVALID_REQUEST");
    const rows = (await prisma.$queryRaw`
      SELECT "id" FROM "User" WHERE "email" = ${email}::varchar AND "role" = ${"STUDENT"}::text::"UserRole" LIMIT 1`) as unknown as Array<{ id: string }>;
    const student = rows[0];
    if (!student) throw new Error("STUDENT_NOT_FOUND");
    await prisma.$executeRaw`
      INSERT INTO "TeacherStudentAccess" ("teacherId","studentId")
      VALUES (${actor.id}::uuid, ${student.id}::uuid)
      ON CONFLICT ("teacherId","studentId") DO NOTHING`;
    return jsonOk({ granted: true, studentId: student.id });
  }

  if (body.action === "revoke" && body.studentId) {
    await prisma.$executeRaw`
      DELETE FROM "TeacherStudentAccess"
      WHERE "teacherId" = ${actor.id}::uuid AND "studentId" = ${body.studentId}::uuid`;
    return jsonOk({ revoked: true });
  }

  throw new Error("INVALID_ACTION");
});
