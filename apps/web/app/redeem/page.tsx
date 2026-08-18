"use client";
import { useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ entitlementEndsAt: string; planCode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/v1/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg: Record<string, string> = {
          INVALID_CODE: "โค้ดไม่ถูกต้องหรือหมดอายุ",
          CODE_EXHAUSTED: "โค้ดนี้ถูกใช้จนหมดแล้ว",
          PER_USER_LIMIT: "คุณใช้โค้ดนี้ครบที่จำกัดแล้ว"
        };
        setError(msg[data.error?.code] ?? data.error?.code ?? "REDEEM_FAILED");
        setBusy(false);
        return;
      }
      setResult(data.data);
    } catch { setError("NETWORK_ERROR"); setBusy(false); }
    setBusy(false);
  }

  return (
    <PageShell title="Redeem Code" description="Redeem an access code using an idempotent server-side transaction.">
      <form onSubmit={onSubmit} style={{ maxWidth: 520, marginTop: 24, display: "grid", gap: 14 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>รหัส Redeem</label>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="AITUTOR-2026-DEMO" style={{ width: "100%", padding: 10, fontSize: 16, letterSpacing: 1 }} />
        </div>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {result && (
          <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 10, padding: 16 }}>
            <p style={{ margin: 0 }}>แลกสำเร็จ! พัชร์แพ็กเกจ <strong>{result.planCode}</strong> ถึง {new Date(result.entitlementEndsAt).toLocaleDateString("th-TH")}</p>
          </div>
        )}
        <button type="submit" disabled={busy || !code} style={{ padding: "10px 20px", cursor: busy ? "wait" : "pointer" }}>
          {busy ? "กำลังแลก..." : "แลกโค้ด"}
        </button>
        <p style={{ color: "#6b7280", fontSize: 14 }}>รหัสทดสอบในระบบ: AITUTOR-2026-DEMO (แพ็กเกจ premium 30 วัน)</p>
      </form>
    </PageShell>
  );
}
