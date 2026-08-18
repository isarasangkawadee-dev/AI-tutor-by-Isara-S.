"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Student = { id: string; email: string; displayName: string | null; points: number; level: number };

export default function TeacherPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<{ attempts: number; avgPercent: number } | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await fetch("/api/v1/teacher");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) { setError("FORBIDDEN (เฉพาะครูและแอดมิน)"); return; }
        setError(data.error?.code ?? "LOAD_FAILED");
        return;
      }
      setStudents(data.data.students);
      setStats(data.data.stats ?? null);
    } catch { setError("NETWORK_ERROR"); }
  }

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/v1/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail: email, action: "grant" })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "GRANT_FAILED"); return; }
      setNotice("ให้สิทธิ์เข้าถึงสำเร็จ");
      setEmail("");
      await load();
    } catch { setError("NETWORK_ERROR"); }
  }

  return (
    <PageShell title="Teacher Dashboard" description="Accessible students only; no Admin-only operations.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error}</p> : (
        <div style={{ maxWidth: 800, marginTop: 24, display: "grid", gap: 16 }}>
          {stats && <p>แบบทดสอบที่ส่งแล้ว {stats.attempts} ครั้ง • คะแนนเฉลี่ย {stats.avgPercent}%</p>}

          {/* Navigation */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            <a href="/teacher/imports"
              style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, textDecoration: "none", color: "inherit" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700 }}>📥 Imports</p>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>อิมพร์ต/ดาวน์โหลดข้อสอบ</p>
            </a>
          </div>
          <form onSubmit={grant} style={{ display: "flex", gap: 10, alignItems: "end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: 4 }}>ให้สิทธิ์นักเรียน (email)</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 10 }} />
            </div>
            <button type="submit" style={{ padding: "10px 16px", cursor: "pointer" }}>ให้สิทธิ์</button>
          </form>
          {notice && <p style={{ color: "#15803d" }}>{notice}</p>}
          {students.length === 0 ? <p style={{ color: "#6b7280" }}>ยังไม่มีนักเรียนที่ได้รับสิทธิ์</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ textAlign: "left" }}><th style={{ padding: 8 }}>ชื่อ</th><th>Email</th><th>ให้สิทธิ์เมื่อ</th><th>คะแนนเฉลี่ย</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 8 }}>{s.displayName ?? "—"}</td>
                  <td style={{ padding: 8 }}>{s.email}</td>
                  <td style={{ padding: 8 }}>—</td>
                  <td style={{ padding: 8 }}>{s.level}</td>
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
