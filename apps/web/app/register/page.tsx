"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/app/_components/PageShell";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName: displayName || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.code ?? "REGISTER_FAILED");
        setBusy(false);
        return;
      }
      router.push("/login");
    } catch {
      setError("NETWORK_ERROR");
      setBusy(false);
    }
  }

  return (
    <PageShell title="Register" description="Create a STUDENT account. Teacher and Admin roles cannot be self-selected.">
      <form onSubmit={onSubmit} style={{ maxWidth: 420, marginTop: 24 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 6 }}>ชื่อที่แสดง</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: "100%", padding: 10, fontSize: 16 }}
          />
        </div>
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
          <label style={{ display: "block", marginBottom: 6 }}>รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</label>
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
            {error === "EMAIL_EXISTS" ? "อีเมลนี้ถูกใช้งานแล้ว" : `Error: ${error}`}
          </div>
        )}
        <button type="submit" disabled={busy} style={{ padding: "10px 24px", fontSize: 16, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
        <p style={{ marginTop: 16, color: "#4b5563" }}>
          มีบัญชีอยู่แล้ว? <a href="/login">เข้าสู่ระบบ</a>
        </p>
      </form>
    </PageShell>
  );
}
