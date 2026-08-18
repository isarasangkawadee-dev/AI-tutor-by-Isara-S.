"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Entry = { rank: number; id: string; displayName: string | null; email: string; points: number; level: number };

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/leaderboards");
        const data = await res.json();
        if (!res.ok) { setError(data.error?.code ?? "LOAD_FAILED"); return; }
        setEntries(data.data.items);
      } catch { setError("NETWORK_ERROR"); }
    })();
  }, []);

  return (
    <PageShell title="Leaderboard" description="Daily, weekly, monthly and all-time rankings with privacy controls.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error}</p> : entries.length === 0 ? <p style={{ marginTop: 24 }}>กำลังโหลดอันดับ...</p> : (
        <table style={{ width: "100%", maxWidth: 700, marginTop: 24, borderCollapse: "collapse" }}>
          <thead><tr style={{ textAlign: "left" }}><th style={{ padding: 8 }}>อันดับ</th><th>ชื่อ</th><th>คะแนน</th><th>เลเวล</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderTop: "1px solid #e5e7eb", background: e.rank <= 3 ? "#fefce8" : "transparent" }}>
                <td style={{ padding: 8, fontWeight: 700 }}>{e.rank}</td>
                <td style={{ padding: 8 }}>{e.displayName ?? "—"}</td>
                <td style={{ padding: 8 }}>{e.points}</td>
                <td style={{ padding: 8 }}>{e.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
