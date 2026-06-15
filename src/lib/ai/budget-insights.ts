import { askGeminiJson, isGeminiConfigured } from "@/lib/ai/gemini";
import type { MonthSummary, MonthlyLedgerEntry } from "@/types/ledger";

export type BudgetInsight = {
  headline: string;
  remainingAnalysis: string;
  variableTrend: string;
  dailyTips: string[];
};

const FALLBACK: BudgetInsight = {
  headline: "תקציב משתנה זמין לחודש",
  remainingAnalysis:
    "השאר יתרה לקניות, מסעדות וקניות חד-פעמיות אחרי כיסוי ההוצאות הקבועות.",
  variableTrend: "עקוב אחרי הוצאות משתנות ברשימת החודש.",
  dailyTips: [
    "קבע תקרה שבועית למזון ודבק בה",
    "דחה קניות לא דחופות לסוף החודש",
    "בדוק מנויים שלא בשימוש",
  ],
};

export async function generateBudgetInsights(
  summary: MonthSummary,
  entries: MonthlyLedgerEntry[],
): Promise<BudgetInsight> {
  if (!isGeminiConfigured()) {
    const remaining = summary.remainingForVariable;
    return {
      ...FALLBACK,
      headline:
        remaining >= 0
          ? `נשארו ${remaining.toFixed(0)} ₪ להוצאות משתנות`
          : `חוסר של ${Math.abs(remaining).toFixed(0)} ₪ אחרי קבועים`,
      remainingAnalysis: `הכנסות ${summary.totalIncome.toFixed(0)} ₪, קבועים ${summary.totalFixedExpenses.toFixed(0)} ₪, משתנות ${summary.totalVariableExpenses.toFixed(0)} ₪.`,
    };
  }

  const variableItems = entries
    .filter((e) => e.is_variable)
    .map((e) => `${e.name}: ${e.amount}`)
    .join("\n");

  const prompt = `Month ${summary.monthKey} household budget:
Income: ${summary.totalIncome} ILS
Fixed expenses: ${summary.totalFixedExpenses} ILS
Variable expenses so far: ${summary.totalVariableExpenses} ILS
Remaining for variable: ${summary.remainingForVariable} ILS
Net after all: ${summary.netAfterAll} ILS

Variable entries:
${variableItems || "(none yet)"}

Respond in Hebrew JSON:
{
  "headline": "short punchy summary",
  "remainingAnalysis": "2-3 sentences on remaining budget",
  "variableTrend": "comment on variable spending pattern",
  "dailyTips": ["tip1", "tip2", "tip3"]
}`;

  try {
    return await askGeminiJson<BudgetInsight>(prompt, "You are a concise Hebrew household finance coach.");
  } catch {
    return FALLBACK;
  }
}
