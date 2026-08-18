"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/app/_components/PageShell";

type Question = {
  id: string; subject: string; grade: number; difficulty: string; stem: string; type: string;
  order: number;
  choices: Array<{ label: string; content: string }>;
  answered: { choiceIds: string[]; clientRevision: number } | null;
};

export default function ExamPlayer() {
  return <Suspense fallback={<PageShell title="Loading" description=""><p>กำลังโหลด...</p></PageShell>}><ExamPlayerInner /></Suspense>;
}

function ExamPlayerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId") ?? "";
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<{ id: string; status: string; mode: string; expiresAt: string | null } | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      try {
        const res = await fetch(`/api/v1/exams/${attemptId}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error?.code ?? "LOAD_FAILED"); return; }
        setAttempt(data.data.attempt);
        setQuestions(data.data.questions.sort((a: Question, b: Question) => a.order - b.order));
        const saved = localStorage.getItem(`answers-${attemptId}`);
        if (saved) {
          const map: Record<string, string[]> = JSON.parse(saved);
          setQuestions((prev) => prev.map((q) => ({ ...q, answered: map[q.id] ? { choiceIds: map[q.id], clientRevision: 0 } : q.answered })));
        }
      } catch { setError("NETWORK_ERROR"); }
    })();
  }, [attemptId]);

  useEffect(() => {
    if (!attempt?.expiresAt) return;
    const iv = setInterval(() => {
      const ms = new Date(attempt.expiresAt!).getTime() - Date.now();
      setExpiresIn(ms > 0 ? Math.floor(ms / 1000) : 0);
    }, 1000);
    return () => clearInterval(iv);
  }, [attempt?.expiresAt]);

  async function saveAnswer(q: Question, choiceIds: string[]) {
    setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, answered: { choiceIds, clientRevision: (x.answered?.clientRevision ?? 0) + 1 } } : x)));
    const map: Record<string, string[]> = {};
    localStorage.setItem(`answers-${attemptId}`, JSON.stringify(questions.reduce((acc, x) => {
      acc[x.id] = x.id === q.id ? choiceIds : (x.answered?.choiceIds ?? []);
      return acc;
    }, {} as Record<string, string[]>)));
    try {
      await fetch(`/api/v1/exams/${attemptId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, choiceIds })
      });
    } catch { /* will retry on save click */ }
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/exams?op=submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "SUBMIT_FAILED"); setBusy(false); return; }
      localStorage.removeItem(`answers-${attemptId}`);
      router.push(`/exam/result?attemptId=${attemptId}`);
    } catch { setError("NETWORK_ERROR"); setBusy(false); }
  }

  if (error || !attempt) {
    return (
      <PageShell title="Exam Player" description="Accessible exam workspace with timer, progress and navigator.">
        {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>โหลดแบบทดสอบไม่สำเร็จ: {error} — <a href="/exam">กลับไปหน้าตั้งค่า</a></p> : <p>กำลังโหลด...</p>}
      </PageShell>
    );
  }

  const q = questions[index];
  return (
    <PageShell title={`ข้อ ${q?.order ?? index + 1} จาก ${questions.length}`} description={`${attempt.mode} • ${attempt.status}${expiresIn !== null ? ` • เหลือเวลา ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}` : ""}`}>
      <div style={{ maxWidth: 760, marginTop: 24, display: "grid", gap: 18 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {questions.map((x, i) => (
            <button key={x.id} onClick={() => setIndex(i)}
              style={{ padding: "6px 10px", borderRadius: 6, cursor: "pointer", background: i === index ? "#111" : (x.answered ? "#dcfce7" : "#f3f4f6"), color: i === index ? "#fff" : "#111", border: "1px solid #d1d5db" }}>
              {x.order}
            </button>
          ))}
        </div>
        {q && (
          <>
            <div style={{ fontSize: 18, lineHeight: 1.7, padding: 16, background: "#f9fafb", borderRadius: 10 }}>
              <p style={{ color: "#6b7280", marginBottom: 8 }}>{q.subject} • ชั้นมัธยมปลายปีที่ {q.grade} • {q.difficulty}</p>
              {q.stem}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {q.choices.map((c) => {
                const selected = (q.answered?.choiceIds ?? []).includes(c.label);
                return (
                  <label key={c.label} style={{ display: "block", padding: 14, border: selected ? "2px solid #111" : "1px solid #d1d5db", borderRadius: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={selected} onChange={(e) => {
                      const next = e.target.checked
                        ? [...(q.answered?.choiceIds ?? []), c.label]
                        : (q.answered?.choiceIds ?? []).filter((l) => l !== c.label);
                      saveAnswer(q, next);
                    }} style={{ marginRight: 10 }} />
                    <strong>{c.label}</strong> {c.content}
                  </label>
                );
              })}
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setIndex(Math.max(index - 1, 0))} disabled={index === 0} style={{ padding: "8px 16px", cursor: "pointer" }}>ข้อก่อนหน้า</button>
          <button onClick={() => setIndex(Math.min(index + 1, questions.length - 1))} disabled={index === questions.length - 1} style={{ padding: "8px 16px", cursor: "pointer" }}>ข้อถัดไป</button>
          <button onClick={submit} disabled={busy} style={{ padding: "8px 16px", background: "#b91c1c", color: "#fff", cursor: busy ? "wait" : "pointer", marginLeft: "auto" }}>
            {busy ? "กำลังส่ง..." : "ส่งคำตอบ"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
