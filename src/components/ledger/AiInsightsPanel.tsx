"use client";

import { useQuery } from "@tanstack/react-query";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";

type AiInsightsPanelProps = {
  monthKey: string;
};

type InsightsResponse = {
  insights: {
    headline: string;
    remainingAnalysis: string;
    variableTrend: string;
    dailyTips: string[];
  };
};

export function AiInsightsPanel({ monthKey }: AiInsightsPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai-insights", monthKey],
    queryFn: async () => {
      const res = await fetch(`/api/ai/insights?month=${monthKey}`);
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<InsightsResponse>;
    },
    staleTime: 60_000,
  });

  const insights = data?.insights;

  return (
    <section className="m3-card m3-expressive-enter-delay overflow-hidden">
      <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container px-4 py-3">
        <Sparkles className="h-4 w-4 text-secondary" />
        <h2 className="text-sm font-bold text-on-surface">תובנות AI</h2>
      </div>
      <div className="space-y-3 p-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            מנתח תקציב...
          </div>
        )}
        {isError && (
          <p className="text-sm text-on-surface-variant">
            לא ניתן לטעון תובנות כרגע
          </p>
        )}
        {insights && (
          <>
            <p className="text-base font-bold text-primary">{insights.headline}</p>
            <p className="text-sm leading-relaxed text-on-surface">
              {insights.remainingAnalysis}
            </p>
            <p className="text-sm text-on-surface-variant">
              {insights.variableTrend}
            </p>
            <ul className="space-y-2">
              {insights.dailyTips.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm"
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  {tip}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
