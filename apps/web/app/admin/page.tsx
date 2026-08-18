"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Question = { id: string; subject: string; grade: number; difficulty: string; stem: string; status: string; reviewStatus: string; version: number };

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { load(status); }, [status]);

  async function load(s: string) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/questions?status=${s}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) { setError("FORBIDDEN"); return; }
        setError(data.error?.code ?? "LOAD_FAILED");
        return;
      }
      setQuestions(data.data.items);
    } catch { setError("NETWORK_ERROR"); }
  }

  async function act(questionId: string, action: "publish" | "reject") {
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, action })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "ACTION_FAILED"); return; }
      setNotice(action === "publish" ? "เผยแพร่แล้ว" : "ปฏิเสธแล้ว");
      await load(status);
    } catch { setError("NETWORK_ERROR"); }
  }

  const sections = [
    { href: "/admin/users", label: "Users", desc: "จัดการบทบาท ระงับ กู้คืน" },
    { href: "/admin/questions", label: "Questions", desc: "สร้าง/แก้ไขข้อสอบ" },
    { href: "/admin/imports", label: "Imports", desc: "อิมพอร์ตข้อสอบ JSON" },
    { href: "/admin/codes", label: "Redeem Codes", desc: "สร้างและจัดการโค้ด" },
    { href: "/admin/moderation", label: "Moderation", desc: "รายงานและ Audit Log" },
    { href: "/admin/analytics", label: "Analytics", desc: "สถิติระบบ" }
  ];

  return (
    <PageShell title="Admin Command Center" description="Users, Questions, Imports, Redeem Codes, Analytics, Audit and Moderation.">
      <div style={{ maxWidth: 960, marginTop: 24, display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {sections.map((s) => (
            <a key={s.href} href={s.href} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, textDecoration: "none", color: "inherit" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{s.label}</p>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>{s.desc}</p>
            </a>
          ))}
        </div>
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>ตรวจข้อสอบรออนุมัติ</h3>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 6 }}>
              <option value="PENDING_REVIEW">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : questions.length === 0 ? <p style={{ color: "#6b7280" }}>ไม่มีข้อสอบในเกณฑ์นี้</p> : (
            <div style={{ display: "grid", gap: 10 }}>
              {questions.map((q) => (
                <div key={q.id} style={{ border: "1px solid #f3f4f6", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: 14, color: "#374151" }}>{q.subject} • ม.{q.grade} • {q.difficulty} • {q.status}/{q.reviewStatus}</p>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>{q.stem.slice(0, 200)}...</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "start" }}>
                    <button onClick={() => act(q.id, "publish")} style={{ padding: "6px 12px", cursor: "pointer" }}>อนุมัติ</button>
                    <button onClick={() => act(q.id, "reject")} style={{ padding: "6px 12px", cursor: "pointer", background: "#f3f4f6" }}>ปฏิเสธ</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {notice && <p style={{ color: "#15803d" }}>{notice}</p>}
        </section>
      </div>
    </PageShell>
  );
}
