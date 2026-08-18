"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/app/_components/PageShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.code ?? "LOGIN_FAILED");
        setBusy(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("NETWORK_ERROR");
      setBusy(false);
    }
  }

  return (
    <PageShell title="Login" description="Sign in through the production Auth.js credentials/OAuth adapter. Authentication is enforced server-side.">
      <form onSubmit={onSubmit} style={{ maxWidth: 420, marginTop: 24 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10, fontSize: 16 }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10, fontSize: 16 }}
          />
        </div>
        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 14 }}>
            {error === "INVALID_CREDENTIALS" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : error === "ACCOUNT_LOCKED" ? "บัญชีถูกล็อกชั่วคราวเพราะพยายามเข้าสู่ระบบผิดหลายครั้ง" : `Error: ${error}`}
          </div>
        )}
        <button type="submit" disabled={busy} style={{ padding: "10px 24px", fontSize: 16, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
        <p style={{ marginTop: 16, color: "#4b5563" }}>
          ยังไม่มีบัญชี? <a href="/register">สมัครสมาชิก</a>
        </p>
      </form>
    </PageShell>
  );
}
