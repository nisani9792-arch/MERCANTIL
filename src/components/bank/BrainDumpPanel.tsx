"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils/format";
import type { ParsedFixedItem } from "@/lib/ai/parse-freetext";

export function BrainDumpPanel() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedFixedItem[] | null>(null);
  const [source, setSource] = useState<"ai" | "rules" | null>(null);

  const parseMut = useMutation({
    mutationFn: async (apply: boolean) => {
      const res = await fetch("/api/ai/parse-freetext", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, apply }),
      });
      if (!res.ok) throw new Error("parse failed");
      return res.json() as Promise<{
        items: ParsedFixedItem[];
        source: "ai" | "rules";
        applied?: number;
      }>;
    },
    onSuccess: (data, apply) => {
      if (apply) {
        setText("");
        setPreview(null);
        setSource(null);
        qc.invalidateQueries({ queryKey: ["transactions"] });
      } else {
        setPreview(data.items);
        setSource(data.source);
      }
    },
  });

  return (
    <section className="m3-card overflow-hidden">
      <div className="border-b border-outline-variant bg-surface-container px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-on-surface">Brain Dump</h2>
        </div>
        <p className="text-xs text-on-surface-variant">
          הדבק הכנסות והוצאות קבועות — AI יסנן רק פריטים חוזרים
        </p>
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        <textarea
          className="m3-input min-h-[120px] w-full resize-y px-3 py-2.5 text-sm"
          placeholder={`לדוגמה:\nמשכורת 15000\nשכירות 4500\nחשמל 280\nנטפליקס 55`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!text.trim() || parseMut.isPending}
            onClick={() => parseMut.mutate(false)}
            className="m3-btn-primary flex min-h-[44px] flex-1 items-center justify-center gap-2 px-4 py-2 text-sm"
          >
            {parseMut.isPending && !parseMut.variables ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            תצוגה מקדימה
          </button>
          {preview && preview.length > 0 && (
            <button
              type="button"
              disabled={parseMut.isPending}
              onClick={() => parseMut.mutate(true)}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
            >
              <Check className="h-4 w-4" />
              שמור {preview.length} פריטים
            </button>
          )}
        </div>

        {source && preview && (
          <p className="text-xs text-on-surface-variant">
            מקור: {source === "ai" ? "Gemini AI" : "כללים מקומיים"}
          </p>
        )}

        {preview && preview.length === 0 && (
          <p className="rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
            לא נמצאו פריטים קבועים — נסה לפרט שכירות, משכורת, מנויים וכו׳
          </p>
        )}

        {preview && preview.length > 0 && (
          <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant">
            {preview.map((item, i) => (
              <li
                key={`${item.description}-${i}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-on-surface">
                    {item.description}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {item.categoryName} ·{" "}
                    {item.type === "income" ? "הכנסה" : "הוצאה"}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-bold ${item.type === "income" ? "text-success" : "text-error"}`}
                  dir="ltr"
                >
                  {formatCurrency(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {parseMut.isSuccess && parseMut.variables === true && (
          <p className="text-center text-sm text-success">נשמר בהצלחה ✓</p>
        )}
      </div>
    </section>
  );
}
