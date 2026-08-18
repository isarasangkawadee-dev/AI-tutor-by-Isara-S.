"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Plan = { id: string; code: string; name: string };

export default function MembershipPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mine, setMine] = useState<{ isPremium: boolean; expiresAt: string | null; activeMemberships: Array<{ planId: string; source: string; startsAt: string; endsAt: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/membership");
        const data = await res.json();
        if (!res.ok) { setError(data.error?.code ?? "LOAD_FAILED"); return; }
        setPlans(data.data.plans);
        setMine(data.data.myMembership);
      } catch { setError("NETWORK_ERROR"); }
    })();
  }, []);

  return (
    <PageShell title="Membership" description="View current access plan and entitlement expiry.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error}</p> : (
        <div style={{ maxWidth: 700, marginTop: 24, display: "grid", gap: 16 }}>
          <section style={{ border: mine?.isPremium ? "2px solid #15803d" : "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: "0 0 8px" }}>แพ็กเกจปัจจุบัน</h2>
            {mine?.isPremium ? (
              <p style={{ fontSize: 18 }}>
                <strong>Premium</strong> — หมดอายุ {mine.expiresAt ? new Date(mine.expiresAt).toLocaleDateString("th-TH") : "—"}
              </p>
            ) : <p style={{ color: "#6b7280" }}>ยังไม่มีแพ็กเกจ Premium — <a href="/redeem">แลกโค้ด</a>เพื่อเพิ่มแพ็กเกจ</p>}
            {mine?.activeMemberships && mine.activeMemberships.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {mine.activeMemberships.map((m) => (
                  <p key={m.planId} style={{ margin: "4px 0", color: "#4b5563", fontSize: 14 }}>
                    สมาชิกจาก {m.source} • {new Date(m.startsAt).toLocaleDateString("th-TH")} → {new Date(m.endsAt).toLocaleDateString("th-TH")}
                  </p>
                ))}
              </div>
            )}
          </section>
          <section>
            <h3 style={{ margin: "0 0 10px" }}>แผนทั้งหมด</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {plans.map((p) => (
                <div key={p.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14 }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{p.name} ({p.code})</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}
