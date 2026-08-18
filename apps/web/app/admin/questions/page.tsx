"use client";
import { useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

const SUBJECTS = ["MATHEMATICS", "SCIENCE", "THAI", "SOCIAL_STUDIES", "ENGLISH"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

export default function AdminQuestionsPage() {
  const [subject, setSubject] = useState("MATHEMATICS");
  const [grade, setGrade] = useState(4);
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [stem, setStem] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch("/api/v1/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, grade, difficulty, type: "SINGLE_CHOICE",
          stem, choices, correctAnswer: [correct], explanation: undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.code ?? "CREATE_FAILED");
        setBusy(false);
        return;
      }
      setNotice("สร้างข้อสอบสำเร็จ — ส่งตรวจ PENDING_REVIEW");
      setStem(""); setChoices(["", "", "", ""]); setCorrect(0);
    } catch { setError("NETWORK_ERROR"); setBusy(false); }
    setBusy(false);
  }

  return (
    <PageShell title="Admin · Questions" description="Create, review, approve, publish, archive and bulk-manage Question Bank items.">
      <form onSubmit={onSubmit} style={{ maxWidth: 720, marginTop: 24, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>วิชา</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: 8 }}>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>ชั้น ม.{grade}</label>
            <input type="number" min={1} max={6} value={grade} onChange={(e) => setGrade(Number(e.target.value))} style={{ width: "100%", padding: 8 }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>ความยาก</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ width: "100%", padding: 8 }}>
              {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4 }}>โจทย์</label>
          <textarea value={stem} onChange={(e) => setStem(e.target.value)} required rows={3} style={{ width: "100%", padding: 10 }} />
        </div>
        {choices.map((c, i) => (
          <label key={i} style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
            <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} />
            <input value={c} onChange={(e) => setChoices(choices.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={`ตัวเลือก ${String.fromCharCode(65 + i)}`} style={{ flex: 1, padding: 8 }} />
          </label>
        ))}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {notice && <p style={{ color: "#15803d" }}>{notice}</p>}
        <button type="submit" disabled={busy} style={{ padding: "10px 20px", cursor: busy ? "wait" : "pointer", justifySelf: "start" }}>
          {busy ? "กำลังบันทึก..." : "บันทึกข้อสอบ"}
        </button>
      </form>
    </PageShell>
  );
}
