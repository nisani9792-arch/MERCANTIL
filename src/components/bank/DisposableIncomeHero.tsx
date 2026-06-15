"use client";

import { formatCurrency } from "@/lib/utils/format";
import type { MonthSummary } from "@/types/ledger";
import { cn } from "@/lib/utils/cn";

type DisposableIncomeHeroProps = {
  summary: MonthSummary;
};

export function DisposableIncomeHero({ summary }: DisposableIncomeHeroProps) {
  const remaining = summary.disposableRemaining;
  const isHealthy = remaining >= 0;

  return (
    <section className="m3-card-gold m3-expressive-enter overflow-hidden rounded-3xl p-5 text-center">
      <p className="text-sm font-semibold text-on-surface-variant">
        פנוי להוצאות משתנות
      </p>
      <p
        className={cn(
          "mt-2 text-4xl font-black tracking-tight sm:text-5xl",
          isHealthy ? "text-primary" : "text-error",
        )}
        dir="ltr"
      >
        {formatCurrency(remaining)}
      </p>
    </section>
  );
}
