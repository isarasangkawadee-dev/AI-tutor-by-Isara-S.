import { PageShell } from "@/app/_components/PageShell";

const subjects = [
  { name: "Mathematics", key: "MATHEMATICS" },
  { name: "Science", key: "SCIENCE" },
  { name: "Thai", key: "THAI" },
  { name: "Social Studies", key: "SOCIAL_STUDIES" },
  { name: "English", key: "ENGLISH" }
];

export default function SubjectsPage() {
  return (
    <PageShell title="Subjects" description="Browse Mathematics, Science, Thai, Social Studies and English.">
      <div style={{ maxWidth: 800, marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        {subjects.map((s) => (
          <a key={s.key} href={`/question-bank`} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, textDecoration: "none", color: "inherit", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 8px" }}>{s.name}</h2>
            <p style={{ margin: 0, color: "#6b7280" }}>คลังข้อสอบ • ฝึกทำ • AI Tutor</p>
          </a>
        ))}
      </div>
    </PageShell>
  );
}
