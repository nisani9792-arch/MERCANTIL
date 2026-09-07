"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils/format";
import { formatMonthLabel } from "@/lib/utils/month";
import type { MonthSummary } from "@/types/ledger";

export function MonthlyShareButton({ summary }: { summary: MonthSummary }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const expenses = summary.totalFixedExpenses + summary.totalVariableExpenses;
    const text = [
      `סיכום כלכלי — ${formatMonthLabel(summary.monthKey)}`,
      `הכנסות בתכנון כולל ביצוע: ${formatCurrency(summary.totalIncome)}`,
      `הוצאות בתכנון כולל ביצוע: ${formatCurrency(expenses)}`,
      `יתרה חודשית משוערת: ${formatCurrency(summary.netAfterAll)}`,
      `הכנסות בפועל: ${formatCurrency(summary.actualIncome)}`,
      `הוצאות בפועל: ${formatCurrency(summary.actualExpenses)}`,
      `עודף/חוסר בפועל: ${formatCurrency(summary.actualNet)}`,
      `יתרת מזומן מחושבת: ${formatCurrency(summary.cashBalance)}`,
    ].join("\n");

    if (navigator.share) {
      await navigator.share({ title: "סיכום חודשי", text }).catch(() => undefined);
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-on-primary shadow-elevation-1 transition-transform active:scale-[0.98]"
    >
      {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
      {copied ? "הסיכום הועתק" : "שיתוף סיכום החודש"}
    </button>
  );
}
