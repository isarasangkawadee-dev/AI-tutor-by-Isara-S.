"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/app/_components/PageShell";

export default function ExamResult() {
  return <Suspense fallback={<PageShell title="Loading" description=""><p>กำลังโหลด...</p></PageShell>}><ExamResultInner /></Suspense>;
}

function ExamResultInner() {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId") ?? "";
  const [attempt, setAttempt] = useState<{ id: string; subject: string; status: string; score: number | null; maxScore: number | null; percent: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      try {
        const res = await fetch(`/api/v1/exams/${attemptId}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error?.code ?? "LOAD_FAILED"); return; }
        setAttempt(data.data.attempt);
      } catch { setError("NETWORK_ERROR"); }
    })();
  }, [attemptId]);

  return (
    <PageShell title="Exam Result" description="Score, correctness and recommendations are server-calculated.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error}</p> : attempt ? (
        <div style={{ maxWidth: 600, marginTop: 24 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, textAlign: "center" }}>
            <h2 style={{ margin: 0 }}>{attempt.subject}</h2>
            <p style={{ fontSize: 48, fontWeight: 700, margin: "12px 0" }}>{attempt.percent !== null ? `${attempt.percent}%` : "—"}</p>
            <p style={{ color: "#4b5563" }}>คะแนน {attempt.score}/{attempt.maxScore} • สถานะ {attempt.status}</p>
          </div>
          <p style={{ marginTop: 16 }}>
            <a href="/exam">ทำแบบทดสอบใหม่อีกครั้ ง</a> • <a href="/dashboard">กลับแดชบอร์ด</a>
          </p>
        </div>
      ) : <p style={{ marginTop: 24 }}>กำลังโหลดผล...</p>}
    </PageShell>
  );
}
