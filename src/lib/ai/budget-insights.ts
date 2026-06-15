import { askGeminiJson, isGeminiConfigured } from "@/lib/ai/gemini";
import type {
  HistoricalAverages,
  MonthSummary,
  MonthlyLedgerEntry,
} from "@/types/ledger";

export type SmartInsight = {
  headline: string;
  comparison: string;
  savingsTips: string[];
};

const FALLBACK: SmartInsight = {
  headline: "מעקב חודשי פעיל",
  comparison: "השווה את החודש הנוכחי לממוצע ההיסטורי שלך.",
  savingsTips: [
    "קבע תקרה שבועית למזון",
    "בדוק מנויים שלא בשימוש",
    "דחה קניות לא דחופות",
  ],
};

export async function generateSmartInsights(
  summary: MonthSummary,
  entries: MonthlyLedgerEntry[],
  averages: HistoricalAverages,
  priorMonthExpense?: number,
): Promise<SmartInsight> {
  const totalExpense =
    summary.totalFixedExpenses + summary.totalVariableExpenses;
  const expenseDelta =
    averages.avgExpense > 0
      ? ((totalExpense - averages.avgExpense) / averages.avgExpense) * 100
      : 0;

  const fixedUnpaid = entries
    .filter((e) => e.type === "expense" && !e.is_variable && !e.is_paid)
    .map((e) => `${e.name}: ₪${e.amount}`)
    .join(", ");

  const fixedPaidPct =
    summary.totalFixedExpenses > 0
      ? (summary.fixedExpensesPaid / summary.totalFixedExpenses) * 100
      : 0;

  if (!isGeminiConfigured()) {
    const disposable = summary.disposableRemaining;
    return {
      headline:
        disposable >= 0
          ? `נשארו ₪${disposable.toFixed(0)} להוצאות משתנות`
          : `חרגת ב-₪${Math.abs(disposable).toFixed(0)} מהתקציב המשתנה`,
      comparison:
        summary.fixedExpensesPaid < summary.totalFixedExpenses
          ? `שולמו ${fixedPaidPct.toFixed(0)}% מההוצאות הקבועות — נותרו ₪${(summary.totalFixedExpenses - summary.fixedExpensesPaid).toFixed(0)} לתשלום`
          : expenseDelta > 5
            ? `הוצאת ${expenseDelta.toFixed(0)}% יותר מהממוצע החודשי`
            : "ההוצאות קרובות לממוצע ההיסטורי שלך",
      savingsTips: FALLBACK.savingsTips,
    };
  }

  const variableByCat = entries
    .filter((e) => e.type === "expense" && e.is_variable)
    .map((e) => `${e.category}: ₪${e.amount}`)
    .join(", ");

  const fixedEntries = entries
    .filter((e) => e.type === "expense" && !e.is_variable)
    .map((e) => `${e.name}: ₪${e.amount}${e.is_paid ? " (paid)" : " (unpaid)"}`)
    .join(", ");

  const prompt = `You are monitoring a Hebrew household MonthlyLedger focused on FIXED recurring expenses and disposable income for variable spending.

Month: ${summary.monthKey}

INCOME & FIXED BASELINE:
- Total income: ₪${summary.totalIncome}
- Total fixed expenses (budgeted): ₪${summary.totalFixedExpenses}
- Fixed expenses PAID so far: ₪${summary.fixedExpensesPaid} (${fixedPaidPct.toFixed(0)}%)
- Unpaid fixed: ${fixedUnpaid || "none"}

DISPOSABLE / VARIABLE BUDGET:
- Budget for variable expenses (income minus fixed): ₪${summary.remainingForVariable}
- Variable expenses spent: ₪${summary.totalVariableExpenses}
- REMAINING for variable expenses: ₪${summary.disposableRemaining}
- Net after all: ₪${summary.netAfterAll}

Fixed expense line items: ${fixedEntries || "none"}
Variable spending: ${variableByCat || "none yet"}

Historical 6-month averages:
- Avg income: ₪${averages.avgIncome.toFixed(0)}
- Avg expenses: ₪${averages.avgExpense.toFixed(0)}
- Avg net: ₪${averages.avgNet.toFixed(0)}
${priorMonthExpense ? `Prior month total expenses: ₪${priorMonthExpense}` : ""}

Your job:
1. Warn if fixed expenses are creeping up vs historical average or if unpaid fixed items are piling up.
2. Assess whether the remaining variable budget (₪${summary.disposableRemaining}) is healthy or at risk.
3. Suggest 3 concrete ways to optimize the remaining variable budget.

Respond in Hebrew. Be specific with ₪ amounts and percentages.

JSON only:
{
  "headline": "one punchy line about disposable income or fixed-expense risk",
  "comparison": "2 sentences about fixed expense creep, unpaid items, or variable budget health vs historical average",
  "savingsTips": ["specific tip 1", "specific tip 2", "specific tip 3"]
}`;

  try {
    return await askGeminiJson<SmartInsight>(
      prompt,
      "You are a friendly Hebrew personal finance coach focused on fixed recurring expenses and disposable income. Be specific and actionable.",
    );
  } catch {
    return FALLBACK;
  }
}
