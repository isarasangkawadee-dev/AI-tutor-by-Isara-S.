"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

export default function SettingsPage() {
  const [profile, setProfile] = useState<{ displayName: string | null; school: string | null; grade: number | null; leaderboardVisible: boolean } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState(4);
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/v1/profile");
      const data = await res.json();
      if (res.ok && data.data?.profile) {
        setProfile(data.data.profile);
        setDisplayName(data.data.profile.displayName ?? "");
        setSchool(data.data.profile.school ?? "");
        setGrade(data.data.profile.grade ?? 4);
        setLeaderboardVisible(data.data.profile.leaderboardVisible ?? true);
      } else {
        setError("ยังไม่ได้เข้าสู่ระบบ");
      }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, school, grade, leaderboardVisible })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "SAVE_FAILED"); return; }
      setNotice("บันทึกรายละเอียดสำเร็จ");
    } catch { setError("NETWORK_ERROR"); }
  }

  return (
    <PageShell title="Settings" description="Manage profile details and leaderboard visibility preferences.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error} <a href="/login">เข้าสู่ระบบ</a></p> : profile && (
        <form onSubmit={save} style={{ maxWidth: 560, marginTop: 24, display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>ชื่อที่แสดง</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ width: "100%", padding: 10 }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>โรงเรียน</label>
            <input value={school} onChange={(e) => setSchool(e.target.value)} style={{ width: "100%", padding: 10 }} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>ชั้น ม.{grade}</label>
            <input type="number" min={1} max={6} value={grade} onChange={(e) => setGrade(Number(e.target.value))} style={{ width: "100%", padding: 10 }} />
          </div>
          <label>
            <input type="checkbox" checked={leaderboardVisible} onChange={(e) => setLeaderboardVisible(e.target.checked)} /> แสดงชื่อใน Leaderboard
          </label>
          {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
          {notice && <p style={{ color: "#15803d" }}>{notice}</p>}
          <button type="submit" style={{ padding: "10px 20px", cursor: "pointer", justifySelf: "start" }}>บันทึก</button>
        </form>
      )}
    </PageShell>
  );
}
