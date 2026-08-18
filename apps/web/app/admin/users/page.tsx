"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type User = { id: string; email: string; displayName: string | null; role: string; status: string; points: number; createdAt: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await fetch("/api/v1/admin/users");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) { setError("FORBIDDEN"); return; }
        setError(data.error?.code ?? "LOAD_FAILED");
        return;
      }
      setUsers(data.data.items);
    } catch { setError("NETWORK_ERROR"); }
  }

  async function act(targetId: string, actionOrRole: string) {
    const isRoleAction = actionOrRole === "STUDENT" || actionOrRole === "TEACHER";
    const action = isRoleAction ? "setRole" : actionOrRole;
    const role = isRoleAction ? actionOrRole : undefined;
    const payload = role ? { userId: targetId, action, role } : { userId: targetId, action };
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? action.toUpperCase() + "_FAILED"); return; }
      setNotice(`${action} สำเร็จ`);
      await load();
    } catch { setError("NETWORK_ERROR"); }
  }

  return (
    <PageShell title="Admin · Users" description="Search users, review status/membership and perform audited administrative actions.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error}</p> : (
        <div style={{ marginTop: 24, overflowX: "auto" }}>
          {notice && <p style={{ color: "#15803d" }}>{notice}</p>}
          <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left" }}><th style={{ padding: 8 }}>Email</th><th>ชื่อ</th><th>บทบาท</th><th>สถานะ</th><th>คะแนน</th><th style={{ textAlign: "right" }}>จัดการ</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 8 }}>{u.email}</td>
                  <td style={{ padding: 8 }}>{u.displayName ?? "—"}</td>
                  <td style={{ padding: 8 }}>{u.role}</td>
                  <td style={{ padding: 8 }}>{u.status}</td>
                  <td style={{ padding: 8 }}>{u.points}</td>
                  <td style={{ padding: 8, textAlign: "right", whiteSpace: "nowrap" }}>
                    {u.status === "ACTIVE" ? (
                      <button onClick={() => act(u.id, "suspend")} style={{ padding: "5px 10px", cursor: "pointer", marginRight: 6 }}>ระงับ</button>
                    ) : (
                      <button onClick={() => act(u.id, "activate")} style={{ padding: "5px 10px", cursor: "pointer", marginRight: 6 }}>กู้คืน</button>
                    )}
{u.role !== "ADMIN" && (
                      <button onClick={() => act(u.id, u.role === "TEACHER" ? "STUDENT" : "TEACHER")} style={{ padding: "5px 10px", cursor: "pointer", marginLeft: 6 }}>
                        {u.role === "TEACHER" ? "ลดเป็นนักเรียน" : "ตั้งเป็นครู"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
