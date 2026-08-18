import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { verifyPassword } from "@aitutor/core";
import { prisma } from "./db";

export type SessionUser = {
  id: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  status: string;
};

export const SESSION_COOKIE = "aitutor_session";

export function cookieHeaders(sessionToken: string, action: "set" | "clear"): string[] {
  if (action === "clear") {
    return [
      `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    ];
  }
  return [
    `${SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
      7 * 24 * 60 * 60
    }${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  ];
}

export function extractSessionToken(headers: Headers): string | null {
  const raw = headers.get("cookie");
  if (!raw) return null;
  const match = raw.split(";").find((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.split("=")[1].trim()) : null;
}

export async function requireSession(headers: Headers): Promise<SessionUser> {
  const token = extractSessionToken(headers);
  if (!token) throw unauthorized();

  const sessions = (await prisma.$queryRaw`
    SELECT "id", "userId", "expires" FROM "Session"
    WHERE "sessionToken" = ${token}::varchar`) as unknown as Array<{ userId: string; expires: Date }>;
  const session = sessions[0];
  if (!session) throw unauthorized();
  if ((session.expires as Date) < new Date()) throw unauthorized();

  const users = (await prisma.$queryRaw`
    SELECT "id", "email", "role", "status", "sessionVersion" FROM "User" WHERE "id" = ${session.userId}::uuid`) as unknown as Array<{ id: string; email: string; role: string; status: string; sessionVersion: number }>;
  const user = users[0];
  if (!user) throw unauthorized();
  if (user.status !== "ACTIVE") throw forbidden("ACCOUNT_NOT_ACTIVE");

  return {
    id: user.id,
    email: user.email,
    role: user.role as SessionUser["role"],
    status: user.status
  };
}

export function requireRole(user: SessionUser, roles: string[]): void {
  if (!roles.includes(user.role)) throw forbidden("FORBIDDEN");
}

function unauthorized() {
  return Object.assign(new Error("UNAUTHORIZED"), { status: 401, code: "UNAUTHORIZED" });
}
function forbidden(code: string) {
  return Object.assign(new Error(code), { status: 403, code });
}

// ---------- Registration ----------
export async function registerUser(input: { email: string; password: string; displayName?: string; role?: string }) {
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AppError("INVALID_EMAIL");
  if (password.length < 8) throw new AppError("WEAK_PASSWORD");

  const existingRows = (await prisma.$queryRaw`SELECT "id" FROM "User" WHERE "email" = ${email}`) as unknown as Array<{ id: string }>;
  if (existingRows.length > 0) throw new AppError("EMAIL_EXISTS");

  const salt = randomBytes(16).toString("hex");
  const { scryptSync } = await import("node:crypto");
  const digest = scryptSync(password, salt, 64) as Buffer;
  const passwordHash = `scrypt:${salt}:${digest.toString("hex")}`;

  const created = (await prisma.$queryRaw`
    INSERT INTO "User" ("email", "displayName", "role", "passwordHash", "status")
    VALUES (${email}, ${input.displayName ?? email.split("@")[0]},
            ${"STUDENT"}::text::"UserRole", ${passwordHash}, ${"ACTIVE"}::text::"UserStatus")
    RETURNING "id", "email", "role", "status"`) as unknown as Array<{ id: string; email: string; role: string; status: string }>;
  return created[0];
}

// ---------- Login (with brute-force guard) ----------
export const loginLimiter = { max: 8, windowMs: 15 * 60 * 1000 };

export async function loginUser(email: string, password: string, ipKey: string) {
  const e = String(email ?? "").trim().toLowerCase();
  const locks = (await prisma.$queryRaw`
    SELECT "lockedUntil" FROM "User" WHERE "email" = ${e}::varchar`) as unknown as Array<{ lockedUntil: Date | null }>;
  const lock = locks[0];
  if (lock?.lockedUntil && lock.lockedUntil > new Date()) {
    throw new AppError("ACCOUNT_LOCKED");
  }

  const rows = (await prisma.$queryRaw`
    SELECT "id", "email", "passwordHash", "role", "status", "failedLoginCount", "lockedUntil"
    FROM "User" WHERE "email" = ${e}::varchar`) as unknown as Array<{
    id: string; email: string; passwordHash: string | null; role: string;
    status: string; failedLoginCount: number; lockedUntil: Date | null;
  }>;
  const user = rows[0];
  if (!user) {
    // constant-time-ish response; do not reveal account existence
    await constantFailDelay();
    throw new AppError("INVALID_CREDENTIALS");
  }
  const u = user as unknown as {
    id: string; email: string; passwordHash: string | null; role: string;
    status: string; failedLoginCount: number; lockedUntil: Date | null;
  };
  if (u.status !== "ACTIVE") throw new AppError("ACCOUNT_NOT_ACTIVE");
  if (!u.passwordHash || !verifyPassword(password, u.passwordHash)) {
    const next = u.failedLoginCount + 1;
    const lockedUntil = next >= 10 ? new Date(Date.now() + 30 * 60 * 1000) : null;
    await prisma.$executeRaw`UPDATE "User" SET "failedLoginCount" = ${next},
      "lockedUntil" = ${lockedUntil}::timestamptz WHERE "id" = ${u.id}::uuid`;
    await constantFailDelay();
    throw new AppError("INVALID_CREDENTIALS");
  }

  await prisma.$executeRaw`UPDATE "User" SET "failedLoginCount" = 0, "lockedUntil" = NULL,
    "lastLoginAt" = now(), "sessionVersion" = "sessionVersion" + 1 WHERE "id" = ${u.id}::uuid`;

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.$executeRaw`
    DELETE FROM "Session" WHERE "userId" = ${u.id}::uuid`;
  await prisma.$executeRaw`
    INSERT INTO "Session" ("sessionToken", "userId", "expires")
    VALUES (${sessionToken}::varchar, ${u.id}::uuid, ${expires}::timestamptz)`;
  await prisma.$executeRaw`
    INSERT INTO "SecurityEvent" ("userId", "type", "ipHash")
    VALUES (${u.id}::uuid, 'USER_LOGIN', ${ipKey})`;

  return {
    user: { id: u.id, email: u.email, role: u.role, status: u.status },
    sessionToken,
    expires
  };
}

async function constantFailDelay() {
  // mask timing differences between "user exists" and "bad password"
  await new Promise((r) => setTimeout(r, 60 + Math.random() * 60));
}



// ---------- Logout ----------
export async function logoutSession(token: string) {
  await prisma.$executeRaw`DELETE FROM "Session" WHERE "sessionToken" = ${token}::varchar`;
}

// ---------- Shared helpers ----------
export class AppError extends Error {
  status: number;
  code: string;
  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function jsonOk(data: unknown, init?: ResponseInit) {
  return Response.json({ ok: true, data }, init);
}

export function jsonErr(error: { code: string; message: string; requestId?: string }, status: number, headers?: HeadersInit) {
  return Response.json({ ok: false, error: { requestId: crypto.randomUUID(), ...error } }, { status, headers });
}

export function withErrorHandling(handler: (req: Request, opts: { params?: Record<string, string>; searchParams?: URLSearchParams }) => Promise<Response>) {
  return async (req: Request, ctx: { params?: Record<string, string>; searchParams?: Promise<URLSearchParams> | URLSearchParams } | { params?: Promise<Record<string, string>>; searchParams?: Promise<URLSearchParams> | URLSearchParams }) => {
    try {
      const params = await (ctx.params instanceof Promise ? ctx.params : Promise.resolve(ctx.params));
      const searchParams = ctx.searchParams instanceof Promise ? await ctx.searchParams : (ctx.searchParams as URLSearchParams | undefined);
      return await handler(req, { params, searchParams });
    } catch (err) {
      // Server error logging is opt-in via LOG_ERRORS=1 (off by default in production)
      if (process.env.LOG_ERRORS === "1") console.error("[AITUTOR-API-ERROR]", err);
      const e = err as { code?: string; status?: number; message?: string };
      const code = e.code ?? "INTERNAL_ERROR";
      const status = e.status ?? 500;
      const message = status === 500 ? "INTERNAL_ERROR" : (e.message ?? code);
      return jsonErr({ code, message }, status);
    }
  };
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(Date.now() + windowMs);
  const rows = (await prisma.$queryRaw`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt}::timestamptz)
    ON CONFLICT ("key") DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count", "resetAt"`) as unknown as Array<{ count: number; resetAt: Date }>;
  const r = rows[0];
  if (r.resetAt < now) {
    await prisma.$executeRaw`UPDATE "RateLimitBucket" SET "count" = 1, "resetAt" = ${resetAt}::timestamptz WHERE "key" = ${key}`;
    return true;
  }
  return r.count <= limit;
}

export function originFromRequest(req: Request): string | undefined {
  return req.headers.get("origin") ?? undefined;
}

export function requireSameOrigin(req: Request): void {
  const origin = originFromRequest(req);
  if (!origin) throw new AppError("CSRF_ORIGIN_REQUIRED", 403);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let a: URL;
  let b: URL;
  try { a = new URL(origin); } catch { throw new AppError("CSRF_ORIGIN_REQUIRED", 403); }
  try { b = new URL(appUrl); } catch { throw new AppError("CSRF_ORIGIN_REQUIRED", 403); }
  if (a.origin !== b.origin) throw new AppError("CSRF_ORIGIN_REJECTED", 403);
}

export function ipKeyFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip");
  return ip ? createHash("sha256").update(`ip:${ip}`).digest("hex").slice(0, 48) : "anonymous";
}

export function hashToken(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

export function tokenEquals(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
