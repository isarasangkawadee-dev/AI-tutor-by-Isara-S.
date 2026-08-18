import { AppError, requireRole, requireSession, withErrorHandling, jsonOk, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rateLimit } from "@/lib/server";

export const GET = withErrorHandling(async (req) => {
  const user = await requireSession(req.headers);
  requireRole(user, ["ADMIN"]);
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);

  const rows = (await prisma.$queryRaw`
    SELECT "id","email","role","status","points","level","lastLoginAt","createdAt"
    FROM "User" ORDER BY "createdAt" DESC LIMIT ${limit}`) as unknown as Array<{
    id: string; email: string; role: string; status: string; points: number; level: number;
    lastLoginAt: Date | null; createdAt: Date;
  }>;
  return jsonOk({
    items: rows.map((r) => ({ ...r, lastLoginAt: r.lastLoginAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() }))
  });
});

export const PATCH = withErrorHandling(async (req) => {
  const actor = await requireSession(req.headers);
  requireRole(actor, ["ADMIN"]);
  await rateLimit(`admin:${actor.id}`, 30, 60 * 1000);
  const body = await readJson<{ userId: string; action: "suspend" | "activate" | "setRole" | "resetPassword"; role?: string; password?: string }>(req);

  if (!body.userId) throw new AppError("INVALID_REQUEST");
  const [target] = (await prisma.$queryRaw`
    SELECT "id","role" FROM "User" WHERE "id" = ${body.userId}::uuid LIMIT 1`) as unknown as Array<{ id: string; role: string }>;
  if (!target) throw new AppError("USER_NOT_FOUND", 404);

  if (body.action === "suspend") {
    await prisma.$executeRaw`UPDATE "User" SET "status" = ${"SUSPENDED"}::text::"UserStatus" WHERE "id" = ${body.userId}::uuid`;
  } else if (body.action === "activate") {
    await prisma.$executeRaw`UPDATE "User" SET "status" = ${"ACTIVE"}::text::"UserStatus" WHERE "id" = ${body.userId}::uuid`;
  } else if (body.action === "setRole") {
    if (!["STUDENT", "TEACHER", "ADMIN"].includes(body.role ?? "")) throw new AppError("INVALID_ROLE");
    await prisma.$executeRaw`UPDATE "User" SET "role" = ${body.role}::text::"UserRole" WHERE "id" = ${body.userId}::uuid`;
  } else if (body.action === "resetPassword") {
    const { scryptSync } = await import("node:crypto");
    const password = body.password ?? "";
    if (password.length < 8) throw new AppError("WEAK_PASSWORD");
    const salt = crypto.randomUUID().slice(0, 32);
    const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
    await prisma.$executeRaw`UPDATE "User" SET "passwordHash" = ${hash} WHERE "id" = ${body.userId}::uuid`;
  }

  await prisma.$executeRaw`
    INSERT INTO "AuditLog" ("actorId","action","resourceType","resourceId","requestId")
    VALUES (${actor.id}::uuid, 'ADMIN_USER_UPDATED', 'user', ${body.userId}::uuid, ${`req-${Date.now()}`})`;
  return jsonOk({ updated: true });
});

export { hashToken };
