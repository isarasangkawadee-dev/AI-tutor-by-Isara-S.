const cards = ["Mathematics", "Science", "Thai", "Social Studies", "English"];
export default function Home() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <strong>AI Tutor</strong>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/dashboard">Dashboard</a>
          <a href="/question-bank">คลังข้อสอบ</a>
          <a href="/leaderboard">Leaderboard</a>
          <a href="/community">Community</a>
          <a href="/login">เข้าสู่ระบบ</a>
        </div>
      </nav>
      <section style={{ padding: "72px 0 32px" }}>
        <h1 style={{ fontSize: 48, maxWidth: 760 }}>เรียนให้เข้าใจ ฝึกให้แม่น พัฒนาได้ทุกวัน</h1>
        <p>แพลตฟอร์มข้อสอบ, AI Tutor, Reward และ Community สำหรับ 5 วิชา</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/exam" style={{ padding: "10px 20px", background: "#111", color: "#fff", borderRadius: 8 }}>เริ่มทำข้อสอบ</a>
          <a href="/ai-tutor" style={{ padding: "10px 20px", border: "1px solid #d1d5db", borderRadius: 8 }}>เรียนกับ AI Tutor</a>
          <a href="/redeem" style={{ padding: "10px 20px", border: "1px solid #d1d5db", borderRadius: 8 }}>แลกโค้ด</a>
        </div>
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
        {cards.map((x) => (
          <article key={x} style={{ background: "white", padding: 24, borderRadius: 16, boxShadow: "0 8px 24px #0001" }}>
            <h2>{x}</h2>
            <p>Question Bank • Practice • Analytics</p>
          </article>
        ))}
      </section>
    </main>
  );
}
