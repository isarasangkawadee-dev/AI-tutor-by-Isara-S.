"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Code = { id: string; code: string; planCode: string; maxUses: number; useCount: number; durationDays: number; active: boolean; expiresAt: string | null };

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("AITUTOR-2026-");
  const [planCode, setPlanCode] = useState("premium");
  const [maxUses, setMaxUses] = useState(100);
  const [days, setDays] = useState(30);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await fetch("/api/v1/admin/redeem-codes");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) { setError("FORBIDDEN"); return; }
        setError(data.error?.code ?? "LOAD_FAILED");
        return;
      }
      setCodes(data.data.items);
    } catch { setError("NETWORK_ERROR"); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/redeem-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode, planCode, maxUses, durationDays: days })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "CREATE_FAILED"); return; }
      await load();
    } catch { setError("NETWORK_ERROR"); }
  }

  return (
    <PageShell title="Admin · Redeem Codes" description="Create and manage hashed redeem-code configuration and analytics.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error}</p> : (
        <div style={{ maxWidth: 860, marginTop: 24, display: "grid", gap: 16 }}>
          <form onSubmit={create} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>สร้างโค้ดใหม่</h3>
            <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="AITUTOR-2026-XXXX" style={{ padding: 10 }} required />
            <div style={{ display: "flex", gap: 10 }}>
              <input value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder="planCode" style={{ padding: 10 }} />
              <input type="number" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} title="จำนวนใช้สูงสุด" style={{ padding: 10, width: 100 }} />
              <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} title="จำนวนวัน" style={{ padding: 10, width: 90 }} />
              <button type="submit" style={{ padding: "8px 16px", cursor: "pointer" }}>สร้าง</button>
            </div>
          </form>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left" }}><th style={{ padding: 8 }}>โค้ด</th><th>แผน</th><th>ใช้แล้ว</th><th>สูงสุด</th><th>อายุ</th><th>สถานะ</th></tr></thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 8, fontFamily: "monospace" }}>{c.code}</td>
                  <td style={{ padding: 8 }}>{c.planCode}</td>
                  <td style={{ padding: 8 }}>{c.useCount}</td>
                  <td style={{ padding: 8 }}>{c.maxUses}</td>
                  <td style={{ padding: 8 }}>{c.durationDays} วัน</td>
                  <td style={{ padding: 8 }}>{c.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
