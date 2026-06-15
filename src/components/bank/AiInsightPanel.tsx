"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, AlertTriangle, Repeat, Lightbulb, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SmartInsight } from "@/lib/ai/categorize";

const iconMap = {
  tip: Lightbulb,
  warning: AlertTriangle,
  recurring: Repeat,
  duplicate: AlertTriangle,
  saving: TrendingDown,
};

const severityClass = {
  info: "border-outline-variant bg-surface-container-lowest",
  warn: "border-warning/40 bg-warning-container/20",
  success: "border-success/30 bg-success-container/20",
};

export function AiInsightPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const res = await fetch("/api/ai/insights");
      if (!res.ok) throw new Error("failed");
      return (await res.json()) as { insights: SmartInsight[] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const insights = data?.insights ?? [];

  return (
    <section className="m3-card-gold overflow-hidden">
      <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container px-4 py-2">
        <Sparkles className="h-4 w-4 text-secondary" />
        <h2 className="text-sm font-bold text-on-surface">תובנות AI</h2>
      </div>
      <div className="space-y-2 p-3">
        {isLoading && (
          <p className="py-4 text-center text-sm text-on-surface-variant">מנתח נתונים...</p>
        )}
        {!isLoading && insights.length === 0 && (
          <p className="py-4 text-center text-sm text-on-surface-variant">
            הוסף תנועות כדי לקבל תובנות חכמות
          </p>
        )}
        {insights.map((insight) => {
          const Icon = iconMap[insight.type] ?? Lightbulb;
          return (
            <div
              key={insight.id}
              className={cn(
                "rounded-xl border p-3 transition-transform hover:scale-[1.01]",
                severityClass[insight.severity],
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                <div>
                  <p className="text-sm font-semibold text-on-surface">{insight.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">
                    {insight.body}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
