"use client";

import { useQuery } from "@tanstack/react-query";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { useMonthStore } from "@/stores/useMonthStore";

export function AiInsightPanel() {
  const monthKey = useMonthStore((s) => s.monthKey);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-insights", monthKey],
    queryFn: async () => {
      const res = await fetch(`/api/ai/insights?month=${monthKey}`);
      if (!res.ok) throw new Error("failed");
      return res.json() as Promise<{
        insights: {
          headline: string;
          comparison: string;
          savingsTips: string[];
        };
      }>;
    },
    staleTime: 45_000,
  });

  const insights = data?.insights;

  return (
    <section className="m3-card-gold m3-expressive-enter-delay overflow-hidden">
      <div className="flex items-center gap-2 border-b border-outline-variant px-4 py-3">
        <Sparkles className="h-4 w-4 text-secondary" />
        <h2 className="text-sm font-bold text-on-surface">תובנות AI — תקציב משתנה</h2>
      </div>
      <div className="space-y-3 p-4">
        {isLoading && (
          <div className="flex items-center gap-2 py-4 text-sm text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            מנתח הוצאות קבועות ותקציב משתנה...
          </div>
        )}
        {insights && (
          <>
            <p className="text-lg font-bold text-primary">{insights.headline}</p>
            <p className="text-sm leading-relaxed text-on-surface">
              {insights.comparison}
            </p>
            <ul className="space-y-2">
              {insights.savingsTips.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-sm"
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
