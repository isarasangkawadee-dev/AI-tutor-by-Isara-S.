"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Question = {
  id: string; subject: string; grade: number; difficulty: string;
  type: string; status: string; reviewStatus: string; stem: string;
  version: number; authorId: string; createdAt: string;
};

type ImportSubject = "MATHEMATICS" | "SCIENCE" | "THAI" | "ENGLISH" | "SOCIAL_STUDIES" | "PHYSICS" | "CHEMISTRY" | "BIOLOGY" | "COMPUTING";

const SUBJECTS: ImportSubject[] = ["MATHEMATICS", "SCIENCE", "THAI", "ENGLISH", "SOCIAL_STUDIES", "PHYSICS", "CHEMISTRY", "BIOLOGY", "COMPUTING"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXPERT"] as const;

export default function TeacherImportsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/v1/teacher/imports");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) { setError("FORBIDDEN (เฉพาะครู)"); return; }
        setError(data.error?.code ?? "LOAD_FAILED");
        return;
      }
      setQuestions(data.data.items);
    } catch { setError("NETWORK_ERROR"); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileText(ev.target?.result as string);
    };
    reader.readAsText(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const parsed = JSON.parse(fileText);
      const questions = (Array.isArray(parsed) ? parsed : (parsed.questions ?? [])).map((q: {
        subject?: string; grade?: number; difficulty?: string; stem?: string;
        choices?: string[]; correct?: number[]; correctAnswer?: number[]; explanation?: string;
      }) => ({
        subject: q.subject ?? "MATHEMATICS",
        grade: q.grade ?? 4,
        difficulty: q.difficulty ?? "MEDIUM",
        stem: q.stem ?? "",
        choices: q.choices ?? [],
        correct: q.correct ?? q.correctAnswer ?? [],
        explanation: q.explanation
      }));

      const res = await fetch("/api/v1/teacher/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "IMPORT_FAILED"); setBusy(false); return; }
      setNotice(`อิมพอร์ตสำเร็จ: ${data.data.processed} ข้อ (fail: ${data.data.failed})`);
      setFileText("");
      setFileName(null);
      await load();
    } catch { setError("INVALID_JSON"); setBusy(false); }
    setBusy(false);
  }

  async function onExport() {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/v1/teacher/imports/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: { code: "EXPORT_FAILED" } }));
        setError(data.error?.code ?? "EXPORT_FAILED");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `teacher-questions-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice("ดาวน์โหลดไฟล์สำเร็จ");
    } catch { setError("NETWORK_ERROR"); }
  }

  return (
    <PageShell title="Teacher · Question Import/Export" description="อิมพร์ตหรือดาวน์โหลดข้อสอบส่วนตัวของคุณ">
      <div style={{ maxWidth: 960, marginTop: 24, display: "grid", gap: 16 }}>
        {error && <p style={{ color: "#b91c1c", border: "1px solid #b91c1c", borderRadius: 8, padding: 12 }}>{error}</p>}
        {notice && <p style={{ color: "#15803d", border: "1px solid #15803d", borderRadius: 8, padding: 12 }}>{notice}</p>}

        {/* Import Section */}
        <form onSubmit={onSubmit} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>📥 Import ข้อสอบ (JSON)</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            สร้างไฟล์ JSON หรือ paste ข้อความใน format:
            <code style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
              {"[{\"subject\":\"MATHEMATICS\",\"grade\":4,\"difficulty\":\"EASY\",\"stem\":\"2+2=?\",\"choices\":[\"1\",\"2\",\"3\",\"4\"],\"correct\":[3]}]"}
            </code>
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ flex: 1, display: "flex", alignItems: "center", border: "1px dashed #9ca3af", borderRadius: 8, padding: 12, cursor: "pointer", fontSize: 14, color: "#374151" }}>
              📁 เลือกไฟล์ JSON
              <input type="file" accept=".json,.txt" onChange={handleFileChange} style={{ display: "none" }} />
            </label>
            {fileName && <span style={{ fontSize: 13, color: "#059669", alignSelf: "center" }}>✓ {fileName}</span>}
          </div>
          <textarea value={fileText} onChange={(e) => setFileText(e.target.value)} rows={6}
            placeholder={`[{"subject":"MATHEMATICS","grade":4,"difficulty":"EASY","stem":"2+2=?","choices":["1","2","3","4"],"correct":[3]}]`}
            style={{ padding: 10, fontFamily: "monospace", fontSize: 13, borderRadius: 6, border: "1px solid #d1d5db" }} />
          <button type="submit" disabled={busy || !fileText.trim()}
            style={{ padding: "8px 16px", cursor: busy ? "wait" : "pointer", justifySelf: "start", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600 }}>
            {busy ? "กำลังอิมพร์ต..." : "📤 อิมพร์ตข้อสอบ"}
          </button>
        </form>

        {/* Export Section */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>📤 Export ข้อสอบส่วนตัว (JSON)</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            ดาวน์โหลดข้อสอบที่คุณสร้างทั้งหมดเป็นไฟล์ JSON
          </p>
          <button onClick={onExport}
            style={{ padding: "8px 16px", cursor: "pointer", justifySelf: "start", borderRadius: 6, border: "none", background: "#059669", color: "#fff", fontWeight: 600 }}>
            ⬇️ ดาวน์โหลดไฟล์ JSON
          </button>
        </div>

        {/* My Questions Table */}
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h3 style={{ margin: "0 0 12px" }}>ข้อสอบของคุณ ({questions.length})</h3>
          {questions.length === 0 ? <p style={{ color: "#6b7280", margin: 0 }}>ยังไม่มีข้อสอบ</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: 8 }}>Subject</th><th>M.</th><th>Diff</th><th>คำถาม</th><th>สถานะ</th><th>เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8 }}>{q.subject}</td>
                      <td style={{ padding: 8 }}>{q.grade}</td>
                      <td style={{ padding: 8 }}>{q.difficulty}</td>
                      <td style={{ padding: 8, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.stem}</td>
                      <td style={{ padding: 8 }}>{q.status}</td>
                      <td style={{ padding: 8, fontSize: 12, color: "#6b7280" }}>{new Date(q.createdAt).toLocaleDateString("th-TH")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
