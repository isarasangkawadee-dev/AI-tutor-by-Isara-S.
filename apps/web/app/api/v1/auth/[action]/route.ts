import {
  AppError,
  loginUser,
  logoutSession,
  registerUser,
  requireSession,
  withErrorHandling,
  jsonOk,
  SESSION_COOKIE,
  extractSessionToken,
  requireSameOrigin,
  ipKeyFromRequest
} from "@/lib/auth";
import { readJson } from "@/lib/server";

async function register(req: Request) {
  requireSameOrigin(req);
  await rateLimitFor(req, "register");
  const body = await readJson<{ email: string; password: string; displayName?: string }>(req);
  const user = await registerUser(body);
  const res = jsonOk({ user: { id: user.id, email: user.email, role: user.role, status: user.status } });
  return res;
}

async function login(req: Request) {
  requireSameOrigin(req);
  const ipKey = ipKeyFromRequest(req);
  await rateLimitFor(req, `login:${ipKey}`);
  const body = await readJson<{ email: string; password: string }>(req);
  const { user, sessionToken, expires } = await loginUser(body.email, body.password, ipKey);
  const cookie =
    `${SESSION_COOKIE}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}` +
    `${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
  return new Response(
    JSON.stringify({ ok: true, data: { user, expires: expires.toISOString() } }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Set-Cookie": cookie }
    }
  );
}

async function logout(req: Request) {
  const token = extractSessionToken(req.headers);
  if (token) await logoutSession(token);
  const cookie =
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` +
    `${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
  return new Response(JSON.stringify({ ok: true, data: { loggedOut: true } }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie }
  });
}

async function session(req: Request) {
  const user = await requireSession(req.headers);
  return jsonOk({ user });
}

function rateLimitFor(req: Request, key: string): Promise<void> {
  const ipKey = ipKeyFromRequest(req);
  const id = `api:auth:${key}:${ipKey}`;
  return consumeRateLimit(id, 20, 60 * 1000).then((ok) => {
    if (!ok) throw new AppError("RATE_LIMITED", 429);
  });
}

async function consumeRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const { prisma } = await import("@/lib/db");
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

export const GET = withErrorHandling(async (req, { params }) => {
  const action = params?.action;
  if (action === "session") return session(req);
  if (action === "logout") return logout(req);
  throw new AppError("ROUTE_NOT_FOUND", 404);
});

export const POST = withErrorHandling(async (req, { params }) => {
  const action = params?.action;
  if (action === "register") return register(req);
  if (action === "login") return login(req);
  if (action === "logout") return logout(req);
  throw new AppError("ROUTE_NOT_FOUND", 404);
});
