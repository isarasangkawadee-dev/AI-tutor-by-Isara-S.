"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Question = { id: string; subject: string; grade: number; difficulty: string; stem: string; version: number };

const SUBJECTS = ["", "MATHEMATICS", "SCIENCE", "THAI", "SOCIAL_STUDIES", "ENGLISH"];

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load(cursor?: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      params.set("limit", "20");
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/v1/questions?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "LOAD_FAILED"); setLoading(false); return; }
      setQuestions(data.data.items);
      setNextCursor(data.data.nextCursor);
    } catch { setError("NETWORK_ERROR"); }
    setLoading(false);
  }

  return (
    <PageShell title="Question Bank" description="Search published questions using bounded server-side filters and cursor pagination.">
      <div style={{ maxWidth: 860, marginTop: 24, display: "grid", gap: 16 }}>
        <div>
          <label style={{ marginRight: 10 }}>กรองวิชา: </label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ padding: 8 }}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s || "(ทุกวิชา)"}</option>)}
          </select>
          <button onClick={() => load()} style={{ marginLeft: 12, padding: "8px 16px", cursor: "pointer" }}>ค้นหา</button>
        </div>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {loading ? <p>กำลังโหลด...</p> : questions.length === 0 ? <p>ไม่มีข้อสอบในเกณฑ์ที่เลือก</p> : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ textAlign: "left" }}><th style={{ padding: 8 }}>วิชา</th><th>ชั้น</th><th>ความยาก</th><th>โจทย์</th></tr></thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} style={{ borderTop: "1px solid #e5e7eb", verticalAlign: "top" }}>
                    <td style={{ padding: 10 }}>{q.subject}</td>
                    <td style={{ padding: 10 }}>ม.{q.grade}</td>
                    <td style={{ padding: 10 }}>{q.difficulty}</td>
                    <td style={{ padding: 10, lineHeight: 1.6 }}>{q.stem.slice(0, 220)}{q.stem.length > 220 ? "..." : ""} <a href={`/ai-tutor?questionId=${q.id}`}>ถาม AI Tutor</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {nextCursor && <button onClick={() => load(nextCursor)} style={{ padding: "8px 16px", cursor: "pointer" }}>โหลดเพิ่มเติม</button>}
          </>
        )}
      </div>
    </PageShell>
  );
}
