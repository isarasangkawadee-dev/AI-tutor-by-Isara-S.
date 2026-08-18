"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Report = { id: string; entityType: string; entityId: string; reason: string | null; status: string; createdAt: string };
type Audit = { id: string; actorId: string; action: string; resourceType: string; createdAt: string };

export default function AdminModerationPage() {
  const [tab, setTab] = useState<"reports" | "audit">("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(tab); }, [tab]);

  async function load(scope: "reports" | "audit") {
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/moderation?scope=${scope}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) { setError("FORBIDDEN"); return; }
        setError(data.error?.code ?? "LOAD_FAILED");
        return;
      }
      if (scope === "reports") setReports(data.data.items);
      else setAudit(data.data.items);
    } catch { setError("NETWORK_ERROR"); }
  }

  async function act(id: string, action: string, targetType?: string) {
    setError(null);
    try {
      const payload = action === "resolve" ? { action: "resolveReport", reportId: id } : { action: `${action}Post`, postId: id };
      const res = await fetch("/api/v1/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? action.toUpperCase() + "_FAILED"); return; }
      await load("reports");
    } catch { setError("NETWORK_ERROR"); }
  }

  return (
    <PageShell title="Admin · Community Moderation" description="Review reports, hidden content, sanctions and banned-term configuration.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error}</p> : (
        <div style={{ marginTop: 24, display: "grid", gap: 16, maxWidth: 900 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["reports", "audit"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 16px", cursor: "pointer", background: tab === t ? "#111" : "#f3f4f6", color: tab === t ? "#fff" : "#111", border: "1px solid #d1d5db", borderRadius: 8 }}>
                {t === "reports" ? "รายงานที่ต้องตรวจสอบ" : "Audit Log"}
              </button>
            ))}
          </div>
          {tab === "reports" ? (
            reports.length === 0 ? <p style={{ color: "#6b7280" }}>ไม่มีรายงานค้างอยู่</p> : reports.map((r) => (
              <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <p style={{ margin: "0 0 4px" }}><strong>{r.entityType}</strong> • เหตุผล: {r.reason ?? "—"} • สถานะ: {r.status}</p>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>{r.id} • {new Date(r.createdAt).toLocaleString("th-TH")}</p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => act(r.id, "resolve")} style={{ padding: "6px 12px", cursor: "pointer" }}>แก้ไขแล้ว</button>
                </div>
              </div>
            ))
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ textAlign: "left" }}><th style={{ padding: 8 }}>การกระทำ</th><th>ทรัพยากร</th><th>เวลา</th></tr></thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 8 }}>{a.action}</td>
                    <td style={{ padding: 8 }}>{a.resourceType}</td>
                    <td style={{ padding: 8 }}>{new Date(a.createdAt).toLocaleString("th-TH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </PageShell>
  );
}
