"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

export default function ProfilePage() {
  const [profile, setProfile] = useState<{ email: string; displayName: string | null; role: string; points: number; level: number; grade: number | null; school: string | null; subscriptionExpiresAt: string | null } | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/v1/profile");
      const data = await res.json();
      if (!res.ok) { setError("ACCOUNT_NOT_FOUND"); return; }
      setProfile(data.data.profile);
      setDisplayName(data.data.profile.displayName ?? "");
      setSchool(data.data.profile.school ?? "");
      setGrade(data.data.profile.grade ?? 4);
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
        body: JSON.stringify({ displayName, school, grade })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "SAVE_FAILED"); return; }
      setNotice("บันทึกรายละเอียดสำเร็จ");
      if (res.ok) {
        const pRes = await fetch("/api/v1/profile");
        const pData = await pRes.json();
        if (pRes.ok) setProfile(pData.data.profile);
      }
    } catch { setError("NETWORK_ERROR"); }
  }

  return (
    <PageShell title="Profile" description="Manage safe self-service profile fields. Role and entitlement remain server-authoritative.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error} <a href="/login">เข้าสู่ระบบ</a></p> : profile && (
        <div style={{ maxWidth: 560, marginTop: 24, display: "grid", gap: 16 }}>
          <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <p style={{ margin: 0 }}><strong>{profile.displayName ?? profile.email}</strong> ({profile.role})</p>
            <p style={{ margin: "8px 0 0", color: "#4b5563" }}>คะแนน {profile.points} • เลเวล {profile.level}
              {profile.subscriptionExpiresAt && <> • Premium ถึง {new Date(profile.subscriptionExpiresAt).toLocaleDateString("th-TH")}</>}
            </p>
          </section>
          <form onSubmit={save} style={{ display: "grid", gap: 12, border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
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
            {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
            {notice && <p style={{ color: "#15803d" }}>{notice}</p>}
            <button type="submit" style={{ padding: "10px 20px", cursor: "pointer", justifySelf: "start" }}>บันทึก</button>
          </form>
        </div>
      )}
    </PageShell>
  );
}
