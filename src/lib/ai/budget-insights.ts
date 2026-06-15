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

  if (!isGeminiConfigured()) {
    return {
      headline:
        summary.netAfterAll >= 0
          ? `נשארו ₪${summary.netAfterAll.toFixed(0)} בסוף החודש`
          : `חוסר של ₪${Math.abs(summary.netAfterAll).toFixed(0)}`,
      comparison:
        expenseDelta > 5
          ? `הוצאת ${expenseDelta.toFixed(0)}% יותר מהממוצע החודשי`
          : expenseDelta < -5
            ? `הוצאת ${Math.abs(expenseDelta).toFixed(0)}% פחות מהממוצע — כל הכבוד!`
            : "ההוצאות קרובות לממוצע ההיסטורי שלך",
      savingsTips: FALLBACK.savingsTips,
    };
  }

  const variableByCat = entries
    .filter((e) => e.type === "expense" && e.is_variable)
    .map((e) => `${e.category}: ₪${e.amount}`)
    .join(", ");

  const prompt = `Analyze this Hebrew household budget for month ${summary.monthKey}:

Current month:
- Income: ₪${summary.totalIncome}
- Total expenses: ₪${totalExpense} (fixed ₪${summary.totalFixedExpenses}, variable ₪${summary.totalVariableExpenses})
- Net balance: ₪${summary.netAfterAll}

Historical 6-month averages:
- Avg income: ₪${averages.avgIncome.toFixed(0)}
- Avg expenses: ₪${averages.avgExpense.toFixed(0)}
- Avg net: ₪${averages.avgNet.toFixed(0)}

${priorMonthExpense ? `Prior month total expenses: ₪${priorMonthExpense}` : ""}
Variable spending: ${variableByCat || "none yet"}

Give concrete, actionable Hebrew advice. Compare to averages. Mention specific % changes when relevant.

JSON only:
{
  "headline": "one punchy line",
  "comparison": "2 sentences comparing this month to historical average",
  "savingsTips": ["specific tip 1", "specific tip 2", "specific tip 3"]
}`;

  try {
    return await askGeminiJson<SmartInsight>(
      prompt,
      "You are a friendly Hebrew personal finance coach. Be specific and actionable.",
    );
  } catch {
    return FALLBACK;
  }
}
