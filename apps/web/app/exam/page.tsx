"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/app/_components/PageShell";

const SUBJECTS = ["MATHEMATICS", "SCIENCE", "THAI", "SOCIAL_STUDIES", "ENGLISH"];

export default function ExamPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("MATHEMATICS");
  const [mode, setMode] = useState<"PRACTICE" | "EXAM">("PRACTICE");
  const [count, setCount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/exams?op=start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, mode, count })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.code ?? "START_FAILED");
        setBusy(false);
        return;
      }
      router.push(`/exam/player?attemptId=${data.data.attempt.id}`);
    } catch {
      setError("NETWORK_ERROR");
      setBusy(false);
    }
  }

  return (
    <PageShell title="Exam Setup" description="Configure subject, mode and question count. Practice mode has no time limit; Exam mode expires after 60 minutes.">
      <form onSubmit={start} style={{ maxWidth: 560, marginTop: 24, display: "grid", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>วิชา</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: 10, fontSize: 16 }}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>โหมด</label>
          <div style={{ display: "flex", gap: 10 }}>
            {(["PRACTICE", "EXAM"] as const).map((m) => (
              <label key={m} style={{ padding: 10, border: mode === m ? "2px solid #111" : "1px solid #d1d5db", borderRadius: 8, cursor: "pointer" }}>
                <input type="radio" checked={mode === m} onChange={() => setMode(m)} style={{ marginRight: 8 }} />
                {m} {m === "EXAM" && "(60 นาที)"}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>จำนวนข้อ: {count}</label>
          <input type="range" min={1} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: "100%" }} />
        </div>
        {error && <div style={{ color: "#b91c1c" }}>{error === "INSUFFICIENT_INVENTORY" ? `จำนวนข้อสอบในวิชานี้ไม่พอ — ลดจำนวนข้อลง` : `Error: ${error}`}</div>}
        <button type="submit" disabled={busy} style={{ padding: "10px 24px", fontSize: 16, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "กำลังเริ่ม..." : "เริ่มทำแบบทดสอบ"}
        </button>
      </form>
    </PageShell>
  );
}
