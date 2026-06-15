"use client";

import { useMutation } from "@tanstack/react-query";
import { FileSpreadsheet, Upload, Sparkles } from "lucide-react";
import { useRef, useState } from "react";

type ClassifyPreview = {
  description: string;
  categoryName: string;
  type: string;
  confidence: number;
  cleanedNotes: string;
  source: string;
};

export function ImportWorkspace() {
  const [raw, setRaw] = useState("");
  const [results, setResults] = useState<ClassifyPreview[]>([]);
  const [xlsxResult, setXlsxResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importMut = useMutation({
    mutationFn: async (apply: boolean) => {
      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const items = lines.map((line) => {
        const parts = line.split(/[,;\t]/);
        const amount = Math.abs(Number(parts[parts.length - 1]?.replace(/[^\d.-]/g, "")) || 0);
        const description = parts.slice(0, -1).join(" ") || line;
        return { description, amount: amount || 100, apply };
      });

      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, autoCreateCategories: true }),
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: (data) => {
      setResults(
        data.results.map((r: ClassifyPreview, i: number) => ({
          ...r,
          description: raw.split("\n").filter(Boolean)[i] ?? r.description,
        })),
      );
    },
  });

  const xlsxMut = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/xlsx", { method: "POST", body: form });
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{ imported: number; skipped: number; total: number }>;
    },
    onSuccess: (data) => {
      setXlsxResult(`יובאו ${data.imported} תנועות (${data.skipped} כפולות דולגו) מתוך ${data.total}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-on-surface">ייבוא AI מבנק</h1>
        <p className="text-sm text-on-surface-variant">
          העלה קובץ Excel ממרכנטיל/הפועלים או הדבק שורות — AI ילמד ויסווג
        </p>
      </div>

      <section className="m3-card p-4">
        <h2 className="text-sm font-bold text-on-surface">ייבוא קובץ Excel (עובר ושב)</h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          קובץ xlsx שיוצא מאתר הבנק — מזהה אוטומטית 386+ תנועות
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="mt-3 block w-full text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) xlsxMut.mutate(f);
          }}
        />
        {xlsxMut.isPending && (
          <p className="mt-2 text-sm text-secondary">מייבא ולומד דפוסים...</p>
        )}
        {xlsxResult && (
          <p className="mt-2 text-sm font-semibold text-success">{xlsxResult}</p>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="m3-btn-primary mt-3 inline-flex items-center gap-2 px-4 py-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          בחר קובץ xlsx
        </button>
      </section>

      <section className="m3-card p-4">
        <label className="m3-label">הדבקה ידנית (שורה = תנועה)</label>
        <textarea
          className="m3-input mt-2 min-h-[120px] w-full px-3 py-2 font-mono text-sm"
          placeholder={"03/06/2026 חיוב לכרטיס Visa,-1462.30\n01/06/2026 משכורת חברה,8500.00"}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          dir="ltr"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => importMut.mutate(false)}
            disabled={!raw.trim() || importMut.isPending}
            className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary-container px-4 py-2 text-sm font-semibold text-secondary"
          >
            <Sparkles className="h-4 w-4" />
            {importMut.isPending ? "מנתח..." : "תצוגה מקדימה AI"}
          </button>
          <button
            type="button"
            onClick={() => importMut.mutate(true)}
            disabled={!raw.trim() || importMut.isPending}
            className="m3-btn-primary inline-flex items-center gap-2 px-4 py-2"
          >
            <Upload className="h-4 w-4" />
            ייבוא ושמירה
          </button>
        </div>
      </section>

      {results.length > 0 && (
        <section className="m3-card overflow-hidden">
          <div className="border-b border-outline-variant bg-surface-container px-4 py-2">
            <h2 className="text-sm font-bold">תוצאות סיווג</h2>
          </div>
          <ul className="divide-y divide-outline-variant">
            {results.map((r, i) => (
              <li key={i} className="px-4 py-3 text-sm">
                <p className="font-medium text-on-surface">{r.cleanedNotes || r.description}</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {r.categoryName} · {r.type} · {Math.round(r.confidence * 100)}% ·{" "}
                  {r.source === "ai" ? "Gemini AI" : "כללים + למידה"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
