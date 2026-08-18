"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Post = { id: string; authorId: string; board: string; title: string; pinned: boolean; answerCount: number; upvoteCount: number; createdAt: string };

const BOARDS = ["general", "mathematics", "science", "thai", "social-studies", "english", "exam-prep"];

export default function CommunityPage() {
  const [board, setBoard] = useState("general");
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(board); }, [board]);

  async function load(b: string) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/community?board=${b}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "LOAD_FAILED"); return; }
      setPosts(data.data.items);
    } catch { setError("NETWORK_ERROR"); }
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board, title: newTitle, body: newBody })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "CREATE_FAILED"); return; }
      setNewTitle(""); setNewBody(""); setShowForm(false);
      await load(board);
    } catch { setError("NETWORK_ERROR"); }
  }

  return (
    <PageShell title="Community" description="Discussion boards moderated with status, sanctions, banned terms and appeal channels.">
      <div style={{ maxWidth: 860, marginTop: 24, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {BOARDS.map((b) => (
            <button key={b} onClick={() => setBoard(b)}
              style={{ padding: "8px 14px", cursor: "pointer", background: board === b ? "#111" : "#f3f4f6", color: board === b ? "#fff" : "#111", border: "1px solid #d1d5db", borderRadius: 20 }}>
              {b}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm((s) => !s)} style={{ padding: "8px 16px", cursor: "pointer", justifySelf: "start" }}>
          {showForm ? "ปิดแบบฟอร์ม" : "+ โพสต์ใหม่"}
        </button>
        {showForm && (
          <form onSubmit={createPost} style={{ display: "grid", gap: 10, border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="หัวข้อ" required style={{ padding: 10 }} />
            <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="เนื้อหา" required rows={4} style={{ padding: 10 }} />
            <button type="submit" style={{ padding: "8px 16px", cursor: "pointer", justifySelf: "start" }}>โพสต์</button>
          </form>
        )}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {posts.length === 0 ? <p style={{ color: "#6b7280" }}>ยังไม่มีโพสต์ในบอร์ดนี้</p> : posts.map((p) => (
          <a key={p.id} href={`/post/${p.id}`} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, textDecoration: "none", color: "inherit", display: "block" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{p.pinned && "📌 "}{p.title}</p>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>บอร์ด {p.board} • คำตอบ {p.answerCount} • อัปโหวต {p.upvoteCount}</p>
          </a>
        ))}
      </div>
    </PageShell>
  );
}
