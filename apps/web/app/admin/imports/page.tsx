"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/app/_components/PageShell";

type Job = { id: string; filename: string; status: string; totalItems: number | null; processedItems: number; createdAt: string };
type ExportFilter = { subject: string; grade: string; difficulty: string; format: "json" | "csv" };

export default function AdminImportsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attested, setAttested] = useState(false);
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [exportFilter, setExportFilter] = useState<ExportFilter>({ subject: "", grade: "", difficulty: "", format: "json" });
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await fetch("/api/v1/admin/imports");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) { setError("FORBIDDEN"); return; }
        setError(data.error?.code ?? "LOAD_FAILED");
        return;
      }
      setJobs(data.data.items);
    } catch { setError("NETWORK_ERROR"); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { setFileText(ev.target?.result as string); };
    reader.readAsText(file);
  }

  async function onExport() {
    setExportNotice(null);
    try {
      const params = new URLSearchParams();
      if (exportFilter.subject) params.set("subject", exportFilter.subject);
      if (exportFilter.grade) params.set("grade", exportFilter.grade);
      if (exportFilter.difficulty) params.set("difficulty", exportFilter.difficulty);
      params.set("format", exportFilter.format);
      const res = await fetch(`/api/v1/admin/questions/export?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: { code: "EXPORT_FAILED" } }));
        setError(data.error?.code ?? "EXPORT_FAILED");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aitutor-questions-${Date.now()}.${exportFilter.format}`;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice("✓ Download สำเร็จ");
    } catch { setError("NETWORK_ERROR"); }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const parsed = JSON.parse(fileText);
      const questions = (parsed.questions ?? parsed).map((q: { subject?: string; grade?: number; difficulty?: string; stem?: string; choices?: string[]; correct?: number[]; correctAnswer?: number[]; explanation?: string }) => ({
        subject: q.subject ?? "MATHEMATICS",
        grade: q.grade ?? 4,
        difficulty: q.difficulty ?? "MEDIUM",
        stem: q.stem ?? "",
        choices: q.choices ?? [],
        correct: q.correct ?? q.correctAnswer ?? [],
        explanation: q.explanation
      }));
      const res = await fetch("/api/v1/admin/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, copyrightAttested: attested })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.code ?? "IMPORT_FAILED"); setBusy(false); return; }
      setFileText("");
      setFileName(null);
      await load();
    } catch (err) { setError("INVALID_JSON"); setBusy(false); }
    setBusy(false);
  }

  return (
    <PageShell title="Admin · Imports" description="Upload and review validated question-import jobs before publishing.">
      {error ? <p style={{ marginTop: 24, color: "#b91c1c" }}>{error}</p> : (
        <div style={{ maxWidth: 900, marginTop: 24, display: "grid", gap: 16 }}>
          <div style={{ border: "1px solid #059669", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0, color: "#059669" }}>📤 Export ข ้ อสอบ</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
              <select value={exportFilter.subject} onChange={(e) => setExportFilter({ ...exportFilter, subject: e.target.value })}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }}>
                <option value="">ทุกวิชา</option>
                <option value="MATHEMATICS">คณิตศาสตร์</option>
                <option value="SCIENCE">วิทยาศาสตร์</option>
                <option value="THAI">ภาษาไทย</option>
                <option value="ENGLISH">ภาษาอังกฤษ</option>
                <option value="PHYSICS">ฟิสิกส์</option>
                <option value="CHEMISTRY">เคมี</option>
                <option value="BIOLOGY">ชีววิทยา</option>
              </select>
              <select value={exportFilter.grade} onChange={(e) => setExportFilter({ ...exportFilter, grade: e.target.value })}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }}>
                <option value="">ทุกระดับชั้น</option>
                {[1,2,3,4,5,6].map(g => <option key={g} value={String(g)}>ม.{g}</option>)}
              </select>
              <select value={exportFilter.difficulty} onChange={(e) => setExportFilter({ ...exportFilter, difficulty: e.target.value })}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }}>
                <option value="">ทุกความยาก</option>
                <option value="EASY">ง่าย</option>
                <option value="MEDIUM">ปานกลาง</option>
                <option value="HARD">ยาก</option>
                <option value="EXPERT">เชี่ยวชาญ</option>
              </select>
              <select value={exportFilter.format} onChange={(e) => setExportFilter({ ...exportFilter, format: e.target.value as "json" | "csv" })}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }}>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <button onClick={onExport} style={{ padding: "8px 16px", cursor: "pointer", justifySelf: "start", borderRadius: 6, border: "none", background: "#059669", color: "#fff", fontWeight: 600 }}>
              ⬇️ Download ข ้ อสอบ
            </button>
            {exportNotice && <p style={{ margin: 0, color: "#059669", fontSize: 14 }}>{exportNotice}</p>}
          </div>

          <form onSubmit={onSubmit} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>📥 อิมพร์ตข ้ อสอบ (JSON)</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ flex: 1, display: "flex", alignItems: "center", border: "1px dashed #9ca3af", borderRadius: 8, padding: 10, cursor: "pointer", fontSize: 14, color: "#374151" }}>
                📁 เลือกไฟล์ JSON
                <input type="file" accept=".json,.txt" onChange={handleFileChange} style={{ display: "none" }} />
              </label>
              {fileName && <span style={{ fontSize: 13, color: "#059669", alignSelf: "center" }}>✓ {fileName}</span>}
            </div>
            <textarea value={fileText} onChange={(e) => setFileText(e.target.value)} rows={8}
              placeholder={`[{"subject":"MATHEMATICS","grade":4,"difficulty":"EASY","stem":"...","choices":["a","b","c","d"],"correct":[0]}]`}
              style={{ padding: 10, fontFamily: "monospace", fontSize: 13, borderRadius: 6, border: "1px solid #d1d5db" }} />
            <label style={{ fontSize: 14 }}>
              <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} /> ยืนยันว่ามีลิขสิทธ์ที่ถูกต้องในการใช้เนื้อหา (ต้องติ๊ก)
            </label>
            <button type="submit" disabled={busy || !attested} style={{ padding: "8px 16px", cursor: busy ? "wait" : "pointer", justifySelf: "start" }}>
              {busy ? "กำลังอิมพอร์ต..." : "อิมพอร์ต"}
            </button>
          </form>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left" }}><th style={{ padding: 8 }}>ไฟล์</th><th>สถานะ</th><th>ประมวลผลแล้ว</th><th>รวม</th><th>เวลา</th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 8 }}>{j.filename}</td>
                  <td style={{ padding: 8 }}>{j.status}</td>
                  <td style={{ padding: 8 }}>{j.processedItems}</td>
                  <td style={{ padding: 8 }}>{j.totalItems ?? "—"}</td>
                  <td style={{ padding: 8 }}>{new Date(j.createdAt).toLocaleString("th-TH")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
