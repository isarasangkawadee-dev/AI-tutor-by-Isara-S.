"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/app/_components/PageShell";

type Profile = { id: string; email: string; displayName: string | null; role: string; status: string; points: number; level: number; grade: number | null; school: string | null; subscriptionExpiresAt: string | null };

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attempts, setAttempts] = useState<Array<{ id: string; subject: string; mode: string; status: string; score: number | null; maxScore: number | null; percent: number | null }>>([]);
  const [points, setPoints] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, aRes] = await Promise.all([
          fetch("/api/v1/profile").then((r) => r.json()),
          fetch("/api/v1/exams").then((r) => r.json())
        ]);
        if (pRes.error) {
          setError(pRes.error.code);
          return;
        }
        setProfile(pRes.data.profile);
        setAttempts(aRes.data?.items ?? []);
        const rRes = await fetch("/api/v1/rewards");
        const rData = await rRes.json();
        if (!rRes.ok) return;
        setPoints(rData.data.balance);
      } catch {
        setError("LOAD_FAILED");
      }
    })();
  }, []);

  if (!profile) {
    return (
      <PageShell title="Dashboard" description="Student Dashboard: XP, streak, membership and AI Tutor entry point.">
        {error ? (
          <div style={{ marginTop: 24 }}>
            <p>ยังไม่ได้เข้าสู่ระบบ — <a href="/login">เข้าสู่ระบบก่อน</a></p>
          </div>
        ) : (
          <p style={{ marginTop: 24 }}>กำลังโหลดข้อมูล...</p>
        )}
      </PageShell>
    );
  }

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <PageShell title={`Dashboard — ${profile.displayName ?? profile.email}`} description={`Role: ${profile.role} • Level ${profile.level}${profile.subscriptionExpiresAt ? " • Premium" : ""}`}>
      <div style={{ display: "grid", gap: 24, maxWidth: 900, marginTop: 24 }}>
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h2 style={{ margin: "0 0 10px" }}>คะแนนสะสม</h2>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{points ?? profile.points} points</p>
          <p style={{ color: "#4b5563" }}>ชื่อ: {profile.displayName ?? "—"} • โรงเรียน: {profile.school ?? "—"} • ชั้น: {profile.grade ?? "—"}</p>
        </section>
        <section style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/exam" style={{ padding: "10px 18px", background: "#111", color: "#fff", borderRadius: 8 }}>เริ่มทำแบบทดสอบ</a>
          <a href="/question-bank" style={{ padding: "10px 18px", border: "1px solid #d1d5db", borderRadius: 8 }}>คลังข้อสอบ</a>
          <a href="/ai-tutor" style={{ padding: "10px 18px", border: "1px solid #d1d5db", borderRadius: 8 }}>AI Tutor</a>
          <a href="/community" style={{ padding: "10px 18px", border: "1px solid #d1d5db", borderRadius: 8 }}>Community</a>
          <a href="/redeem" style={{ padding: "10px 18px", border: "1px solid #d1d5db", borderRadius: 8 }}>Redeem Code</a>
          <a href="/profile" style={{ padding: "10px 18px", border: "1px solid #d1d5db", borderRadius: 8 }}>ตั้งค่าโปรไฟล์</a>
        </section>
        <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h2 style={{ margin: "0 0 10px" }}>ประวัติแบบทดสอบ</h2>
          {attempts.length === 0 ? <p style={{ color: "#6b7280" }}>ยังไม่มีประวัติ</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ textAlign: "left" }}><th style={{ padding: 6 }}>วิชา</th><th>โหมด</th><th>สถานะ</th><th>คะแนน</th><th>เปอร์เซ็นต์</th></tr></thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 6 }}>{a.subject}</td><td>{a.mode}</td><td>{a.status}</td>
                    <td>{a.score !== null ? `${a.score}/${a.maxScore}` : "—"}</td>
                    <td>{a.percent !== null ? `${a.percent}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section>
          <button onClick={logout} style={{ padding: "8px 16px", cursor: "pointer" }}>ออกจากระบบ</button>
        </section>
      </div>
    </PageShell>
  );
}
