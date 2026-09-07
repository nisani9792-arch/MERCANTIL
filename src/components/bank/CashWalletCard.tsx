"use client";

import { WalletCards } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthSummary } from "@/types/ledger";

export function CashWalletCard({ summary }: { summary: MonthSummary }) {
  return (
    <section className="m3-card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary">
          <WalletCards className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-on-surface-variant">מזומן שאמור להיות בארנק</p>
          <p className="mt-0.5 text-2xl font-black text-primary" dir="ltr">
            {formatCurrency(summary.cashBalance)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-outline-variant bg-surface-container/45 text-center">
        <div className="border-e border-outline-variant px-3 py-2.5">
          <p className="text-[10px] text-on-surface-variant">נמשך החודש</p>
          <p className="text-sm font-bold text-on-surface" dir="ltr">{formatCurrency(summary.cashWithdrawnThisMonth)}</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[10px] text-on-surface-variant">שולם במזומן</p>
          <p className="text-sm font-bold text-on-surface" dir="ltr">{formatCurrency(summary.cashSpentThisMonth)}</p>
        </div>
      </div>
    </section>
  );
}
