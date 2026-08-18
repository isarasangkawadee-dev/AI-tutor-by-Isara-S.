// Client-side helper: browser always sends session cookie (HttpOnly) automatically.
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {})
    }
  });
  const data = res.headers.get("content-type")?.includes("json")
    ? await res.json()
    : { code: "UNKNOWN", message: res.statusText };
  if (!res.ok) {
    const err = new Error((data as { code?: string; message?: string }).message ?? "REQUEST_FAILED") as Error & { code: string; status: number };
    err.code = (data as { code?: string }).code ?? "REQUEST_FAILED";
    err.status = res.status;
    throw err;
  }
  return data as T;
}
