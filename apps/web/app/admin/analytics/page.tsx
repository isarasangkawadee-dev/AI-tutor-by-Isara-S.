"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Stats = { users: number; questions: number; exams: number; attempts: number; redeemUses: number; tutorSessions: number };

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Analytics aggregates are computed client-side from the accessible public endpoints
        const [usersRes, examsRes, rewardsRes] = await Promise.all([
          fetch("/api/v1/admin/users"),
          fetch("/api/v1/exams"),
          fetch("/api/v1/rewards")
        ]);
        if (!usersRes.ok || !examsRes.ok) {
          if (usersRes.status === 403) { setError("FORBIDDEN"); return; }
          setError("LOAD_FAILED");
          return;
        }
        const users = await usersRes.json();
        const exams = await examsRes.json();
        const rewards = await rewardsRes.json();
        setStats({
          users: users.data?.items?.length ?? 0,
          questions: rewards.data?.stats?.questionsAnswered ?? 0,
          exams: exams.data?.items?.length ?? 0,
          attempts: exams.data?.items?.filter((a: { status: string }) => a.status === "COMPLETED").length ?? 0,
          redeemUses: rewards.data?.stats?.redeemUses ?? 0,
          tutorSessions: rewards.data?.stats?.tutorSessions ?? 0
        });
      } catch { setError("NETWORK_ERROR"); }
    })();
  }, []);

  return (
    <PageShell title="Admin · Analytics" description="DAU/WAU/MAU, exams, score, subject, difficulty and community metrics.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error}</p> : stats ? (
        <div style={{ maxWidth: 700, marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>{k}</p>
              <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 700 }}>{v}</p>
            </div>
          ))}
        </div>
      ) : <p style={{ marginTop: 24 }}>กำลังโหลดสถิติ...</p>}
    </PageShell>
  );
}
