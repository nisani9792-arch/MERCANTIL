"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Info,
  Loader2,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import type { BudgetAnalysis } from "@/lib/ai/budget-insights";
import { fetchLive } from "@/lib/api/fetch-live";
import { useMonthStore } from "@/stores/useMonthStore";
import { cn } from "@/lib/utils/cn";

const severityStyle = {
  alert: "border-error/40 bg-error-container/25",
  warn: "border-warning/40 bg-warning-container/20",
  info: "border-outline-variant bg-surface-container-low",
};

const severityIcon = {
  alert: AlertTriangle,
  warn: TrendingDown,
  info: Info,
};

export function AiInsightPanel() {
  const monthKey = useMonthStore((s) => s.monthKey);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["ai-insights", monthKey],
    queryFn: () =>
      fetchLive<{ analysis: BudgetAnalysis }>(`/api/ai/insights?month=${monthKey}`),
    staleTime: 0,
  });

  const analysis = data?.analysis;

  return (
    <section className="m3-card-gold overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-secondary" />
          <h2 className="text-sm font-bold text-on-surface">ניתוח AI חכם</h2>
        </div>
        {(isLoading || isFetching) && (
          <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
        )}
      </div>

      <div className="space-y-3 p-4">
        {isLoading && !analysis && (
          <p className="py-6 text-center text-sm text-on-surface-variant">
            מנתח חריגות בהכנסות והוצאות...
          </p>
        )}

        {analysis && (
          <>
            <div className="flex items-start gap-3">
              <HealthRing score={analysis.healthScore} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-primary">{analysis.headline}</p>
                <p className="mt-1 text-sm leading-relaxed text-on-surface">
                  {analysis.verdict}
                </p>
              </div>
            </div>

            {analysis.anomalies.length > 0 ? (
              <ul className="space-y-2">
                {analysis.anomalies.map((a) => {
                  const Icon = severityIcon[a.severity];
                  return (
                    <li
                      key={`${a.title}-${a.detail}`}
                      className={cn(
                        "rounded-xl border p-3",
                        severityStyle[a.severity],
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-on-surface">{a.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                            {a.detail}
                          </p>
                          {a.action && (
                            <p className="mt-1.5 text-xs font-semibold text-primary">
                              ← {a.action}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl bg-success-container/30 px-3 py-2.5 text-sm text-success">
                לא זוהו חריגות — המצב נראה מאוזן החודש.
              </p>
            )}

            {analysis.focusItems.length > 0 && (
              <div className="rounded-xl bg-surface-container px-3 py-2.5">
                <p className="text-xs font-bold text-on-surface-variant">מיקוד השבוע</p>
                <ul className="mt-1 space-y-0.5 text-sm text-on-surface">
                  {analysis.focusItems.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function HealthRing({ score }: { score: number }) {
  const color =
    score >= 70 ? "text-success" : score >= 45 ? "text-warning" : "text-error";
  return (
    <div
      className={cn(
        "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 bg-surface-container-lowest",
        color,
      )}
      style={{ borderColor: "currentColor" }}
    >
      <span className="text-lg font-black leading-none">{score}</span>
      <span className="text-[9px] font-semibold">ציון</span>
    </div>
  );
}
