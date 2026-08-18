"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

export default function AchievementsPage() {
  const [me, setMe] = useState<{ rank: number | null; points: number | null; level: number | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, boardRes] = await Promise.all([
          fetch("/api/v1/profile"),
          fetch("/api/v1/leaderboards")
        ]);
        const profile = await profileRes.json();
        const board = await boardRes.json();
        if (profileRes.ok && boardRes.ok) {
          const rank = board.data?.items?.findIndex((e: { email: string; userId: string }) => true) ?? -1;
          const myRank = board.data?.items?.findIndex((e: { userId: string }) => e.userId === profile.data?.profile?.id);
          setMe({
            rank: myRank !== undefined && myRank >= 0 ? myRank + 1 : null,
            points: profile.data?.profile?.points ?? 0,
            level: profile.data?.profile?.level ?? 1
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PageShell title="Achievements" description="XP, levels, badges, streaks and daily/weekly challenges.">
      {loading ? <p style={{ marginTop: 24 }}>กำลังโหลด...</p> : me ? (
        <div style={{ maxWidth: 600, marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>เลเวล</p>
            <p style={{ margin: "8px 0 0", fontSize: 36, fontWeight: 700 }}>{me.level}</p>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>XP</p>
            <p style={{ margin: "8px 0 0", fontSize: 36, fontWeight: 700 }}>{me.points}</p>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, textAlign: "center" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>อันดับ</p>
            <p style={{ margin: "8px 0 0", fontSize: 36, fontWeight: 700 }}>{me.rank ?? "—"}</p>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 24 }}>ยังไม่ได้เข้าสู่ระบบ — <a href="/login">เข้าสู่ระบบ</a></p>
      )}
    </PageShell>
  );
}
