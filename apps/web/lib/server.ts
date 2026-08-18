import {
  AppError,
  consumeRateLimit,
  extractSessionToken,
  ipKeyFromRequest,
  jsonErr,
  jsonOk,
  requireRole,
  requireSession,
  SESSION_COOKIE,
  SessionUser,
  cookieHeaders,
  withErrorHandling
} from "./auth";
import type { PrismaClient } from "@aitutor/db";

export type AuthedContext = {
  user: SessionUser;
  ipKey: string;
  requestId: string;
  setSession?: (token: string) => void;
};

export type ApiHandler<C> = (
  ctx: C,
  req: Request,
  opts: { params?: Record<string, string> }
) => Promise<Response>;

export function apiRoute<C extends AuthedContext>(handler: ApiHandler<C>, roleAllow: string[] = ["STUDENT", "TEACHER", "ADMIN"]) {
  return withErrorHandling(async (req, opts) => {
    const user = await requireSession(req.headers);
    requireRole(user, roleAllow);
    const ctx = {
      user,
      ipKey: ipKeyFromRequest(req),
      requestId: crypto.randomUUID(),
      setSession: (token: string) => {
        req.headers.set("x-set-session", token);
      }
    } as C;
    return await handler(ctx as C, req, opts);
  });
}

export function publicApiRoute<C extends AuthedContext>(handler: ApiHandler<C>, roleAllow: string[] = []) {
  return withErrorHandling(async (req, opts) => {
    let user: SessionUser | null = null;
    try {
      user = await requireSession(req.headers);
      if (roleAllow.length > 0) requireRole(user, roleAllow);
    } catch {
      if (roleAllow.length > 0) throw new AppError("UNAUTHORIZED", 401);
    }
    const ctx = {
      user,
      ipKey: ipKeyFromRequest(req),
      requestId: crypto.randomUUID()
    } as C;
    return await handler(ctx as C, req, opts);
  });
}

export async function readJson<T>(req: Request): Promise<T> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) throw new AppError("JSON_REQUIRED", 415);
  try {
    return (await req.json()) as T;
  } catch {
    throw new AppError("INVALID_JSON", 400);
  }
}

export function sessionHeaders(token: string): HeadersInit {
  return { "Set-Cookie": cookieHeaders(token, "set").join(", ") };
}

export function clearSessionHeaders(): HeadersInit {
  return { "Set-Cookie": cookieHeaders("", "clear").join(", ") };
}

export type Row<T = Record<string, unknown>> = T;

export async function firstRow<T>(rows: unknown): Promise<T | null> {
  return (rows as unknown as Array<T>)[0] ?? null;
}

export function notFound(): never {
  throw new AppError("NOT_FOUND", 404);
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  const ok = await consumeRateLimit(key, limit, windowMs);
  if (!ok) throw new AppError("RATE_LIMITED", 429);
}

// Shared PrismaClient import surface (apps reference this module)
export { prisma } from "./db";
export { AppError, jsonOk, jsonErr, extractSessionToken, SESSION_COOKIE };
