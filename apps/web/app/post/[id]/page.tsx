"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageShell } from "@/app/_components/PageShell";

type Post = { id: string; authorId: string; board: string; title: string; body: string; authorName: string | null; createdAt: string; upvoteCount: number };
type Answer = { id: string; authorId: string; body: string; authorName: string | null; createdAt: string };
type Comment = { id: string; authorId: string; body: string; authorName: string | null; createdAt: string };

export default function PostPage() {
  const params = useParams();
  const postId = params?.id as string;
  const [post, setPost] = useState<Post | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [answerBody, setAnswerBody] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await fetch(`/api/v1/community/posts/${postId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "NOT_FOUND"); return; }
      setPost(data.data.post);
      setAnswers(data.data.answers);
      setComments(data.data.comments);
    } catch { setError("NETWORK_ERROR"); }
  }

  async function act(action: string, payload?: Record<string, string>) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/community/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? action.toUpperCase() + "_FAILED"); return; }
      setNotice(action === "report" ? "รายงานแล้ว ขอบคุณที่ช่วยตรวจสอบ" : "สำเร็จ");
      await load();
    } catch { setError("NETWORK_ERROR"); }
  }

  return (
    <PageShell title={post ? post.title : "Discussion"} description="Thread detail, answers, comments, follow/bookmark/report and moderation state.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error} <a href="/community">กลับไปหน้า Community</a></p> : !post ? <p style={{ marginTop: 24 }}>กำลังโหลด...</p> : (
        <div style={{ maxWidth: 800, marginTop: 24, display: "grid", gap: 18 }}>
          <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <p style={{ margin: "0 0 8px", color: "#6b7280" }}>บอร์ด {post.board} • {post.authorName} • {new Date(post.createdAt).toLocaleDateString("th-TH")}</p>
            <p style={{ fontSize: 18, lineHeight: 1.7, margin: "0 0 12px" }}>{post.body}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => act("upvote")} style={{ padding: "6px 12px", cursor: "pointer" }}>▲ {post.upvoteCount}</button>
              <button onClick={() => act("bookmark")} style={{ padding: "6px 12px", cursor: "pointer" }}>บุ๊คมาร์ก</button>
              <button onClick={() => act("follow")} style={{ padding: "6px 12px", cursor: "pointer" }}>ติดตาม</button>
            </div>
          </section>
          <section>
            <h3 style={{ margin: "0 0 10px" }}>คำตอบ ({answers.length})</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {answers.map((a) => (
                <div key={a.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14 }}>
                  <p style={{ margin: "0 0 6px", lineHeight: 1.6 }}>{a.body}</p>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>{a.authorName}</p>
                </div>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); act("answer", { answer: answerBody }).then(() => setAnswerBody("")); }}
                style={{ display: "grid", gap: 8 }}>
                <textarea value={answerBody} onChange={(e) => setAnswerBody(e.target.value)} placeholder="ตอบกระทู้..." required rows={3} style={{ padding: 10 }} />
                <button type="submit" style={{ padding: "8px 14px", cursor: "pointer", justifySelf: "start" }}>ส่งคำตอบ</button>
              </form>
            </div>
          </section>
          <section>
            <h3 style={{ margin: "0 0 10px" }}>คอมเมนต์ ({comments.length})</h3>
            {comments.map((c) => (
              <div key={c.id} style={{ border: "1px solid #f3f4f6", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <p style={{ margin: "0 0 4px" }}>{c.body}</p>
                <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>{c.authorName}</p>
              </div>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); act("comment", { comment: commentBody }).then(() => setCommentBody("")); }}
              style={{ display: "grid", gap: 8 }}>
              <input value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="คอมเมนต์..." required style={{ padding: 10 }} />
              <button type="submit" style={{ padding: "8px 14px", cursor: "pointer", justifySelf: "start" }}>ส่งคอมเมนต์</button>
            </form>
          </section>
          <section style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
            <form onSubmit={(e) => { e.preventDefault(); act("report", { reason: reportReason || "abuse" }); }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>รายงานกระทู้: </span>
              <input value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="เหตุผล (ไม่ต้องกรอก)" style={{ padding: 8, flex: 1 }} />
              <button type="submit" style={{ padding: "8px 14px", cursor: "pointer" }}>รายงาน</button>
            </form>
            {notice && <p style={{ color: "#15803d" }}>{notice}</p>}
          </section>
        </div>
      )}
    </PageShell>
  );
}
