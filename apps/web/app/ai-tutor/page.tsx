"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/app/_components/PageShell";

type Answer = {
  correct: boolean | null; whyWrong: string | null; concept: string; hint: string;
  subjectRelatedNote: string | null; practiceSuggestion: string | null;
};

export default function AiTutorPage() {
  return <Suspense fallback={<PageShell title="Loading" description=""><p>กำลังโหลด...</p></PageShell>}><AiTutorInner /></Suspense>;
}

function AiTutorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionId = searchParams.get("questionId") ?? "";
  const [questionIdInput, setQuestionIdInput] = useState(questionId);
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (questionId) {
      setQuestionIdInput(questionId);
      ask(questionId, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ask(qId?: string, msg?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: qId ?? (questionIdInput || undefined), message: msg ?? (message || undefined) })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "TUTOR_FAILED"); setBusy(false); return; }
      setAnswer(data.data.answer);
      if (qId || msg) setMessage("");
    } catch { setError("NETWORK_ERROR"); setBusy(false); }
    setBusy(false);
  }

  return (
    <PageShell title="AI Tutor" description="Grounded explanations, hints, step-by-step teaching and generated practice using the canonical Question Bank.">
      <div style={{ maxWidth: 760, marginTop: 24, display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>ถามจากข้อสอบ (ใส่ ID โจทย์ หรือว่างไว้เพื่อถามอิสระ)</label>
            <input value={questionIdInput} onChange={(e) => setQuestionIdInput(e.target.value)}
              style={{ width: "100%", padding: 10, fontSize: 15 }} placeholder="uuid ของข้อสอบ" />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>คำถามของคุณ</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
              style={{ width: "100%", padding: 10, fontSize: 15 }} placeholder="เช่น 'อธิบายวิธีทำแบบเรื่อยๆ'" />
          </div>
          <button onClick={() => ask()} disabled={busy || (!questionIdInput && !message)}
            style={{ padding: "10px 20px", cursor: busy ? "wait" : "pointer" }}>
            {busy ? "กำลังคิด..." : "ถาม AI Tutor"}
          </button>
        </div>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {answer && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
            {answer.correct !== null && (
              <p style={{ fontWeight: 700, color: answer.correct ? "#15803d" : "#b91c1c" }}>
                {answer.correct ? "ตอบถูกต้อง!" : "คำตอบยังไม่ถูก"}
              </p>
            )}
            {answer.whyWrong && <p>เหตุผลที่ยังไม่ถูก: {answer.whyWrong}</p>}
            <p><strong>แนวคิดหลัก:</strong> {answer.concept}</p>
            <p><strong>เบาะแส:</strong> {answer.hint}</p>
            {answer.subjectRelatedNote && <p><strong>ข้อมูลวิชา:</strong> {answer.subjectRelatedNote}</p>}
            {answer.practiceSuggestion && <p><strong>แนะนำฝึกเพิ่ม:</strong> {answer.practiceSuggestion}</p>}
          </div>
        )}
        <p style={{ color: "#6b7280" }}>
          ดูข้อสอบเพื่อถามตรงจาก <a href="/question-bank">คลังข้อสอบ</a> หรือทำ <a href="/exam">แบบทดสอบ</a>
        </p>
      </div>
    </PageShell>
  );
}
