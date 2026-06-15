import { askGeminiJson, isGeminiConfigured } from "@/lib/ai/gemini";
import {
  computeHealthScore,
  detectAnomalies,
  type DetectedAnomaly,
} from "@/lib/ai/anomaly-detector";
import type {
  FixedTemplate,
  HistoricalAverages,
  MonthSummary,
  MonthTrendPoint,
  MonthlyLedgerEntry,
} from "@/types/ledger";

export type BudgetAnalysis = {
  headline: string;
  verdict: string;
  healthScore: number;
  anomalies: Array<{
    severity: "alert" | "warn" | "info";
    title: string;
    detail: string;
    action?: string;
  }>;
  focusItems: string[];
};

function formatEntries(entries: MonthlyLedgerEntry[]) {
  const income = entries
    .filter((e) => e.type === "income")
    .map((e) => `${e.name}: ₪${e.amount}`)
    .join(", ");
  const fixed = entries
    .filter((e) => e.type === "expense" && !e.is_variable)
    .map((e) => `${e.name}: ₪${e.amount}`)
    .join(", ");
  const variable = entries
    .filter((e) => e.type === "expense" && e.is_variable)
    .map((e) => `${e.name} (${e.category}): ₪${e.amount}`)
    .join(", ");
  return { income, fixed, variable };
}

function ruleBasedAnalysis(
  summary: MonthSummary,
  entries: MonthlyLedgerEntry[],
  averages: HistoricalAverages,
  trend: MonthTrendPoint[],
  templates: FixedTemplate[],
): BudgetAnalysis {
  const detected = detectAnomalies(summary, entries, averages, trend, templates);
  const healthScore = computeHealthScore(summary, detected);
  const disposable = summary.disposableRemaining;

  const anomalies = detected.map((d) => ({
    ...d,
    action:
      d.severity === "alert"
        ? "בדוק מיד אילו הוצאות ניתן לדחות או לצמצם החודש."
        : d.severity === "warn"
          ? "השווה לחודשים קודמים ולתבנית הבסיס."
          : undefined,
  }));

  return {
    headline:
      disposable >= 0
        ? `נשארו ₪${disposable.toFixed(0)} לגמישות החודש`
        : `חריגה של ₪${Math.abs(disposable).toFixed(0)} מהתקציב`,
    verdict:
      anomalies.length > 0
        ? `זיהיתי ${anomalies.length} נקודות שדורשות תשומת לב. מצב כללי: ${healthScore}/100.`
        : `המצב מאוזן. ${healthScore}/100 — ההוצאות בקו עם ההכנסות והבסיס שלך.`,
    healthScore,
    anomalies,
    focusItems: anomalies.slice(0, 3).map((a) => a.title),
  };
}

export async function generateBudgetAnalysis(
  summary: MonthSummary,
  entries: MonthlyLedgerEntry[],
  averages: HistoricalAverages,
  trend: MonthTrendPoint[],
  templates: FixedTemplate[],
): Promise<BudgetAnalysis> {
  const detected = detectAnomalies(summary, entries, averages, trend, templates);
  const healthScore = computeHealthScore(summary, detected);
  const { income, fixed, variable } = formatEntries(entries);

  const fallback = ruleBasedAnalysis(
    summary,
    entries,
    averages,
    trend,
    templates,
  );

  if (!isGeminiConfigured()) return fallback;

  const detectedJson = JSON.stringify(detected, null, 0);
  const trendJson = trend
    .map((t) => `${t.monthKey}: הכנסה ₪${t.income} הוצאה ₪${t.expense}`)
    .join(" | ");

  const prompt = `אתה יועץ פיננסי אישי חכם (2026) למשק בית ישראלי. נתח את הנתונים ותתערב — אל תחזור נתונים יבשים.

חודש: ${summary.monthKey}
הכנסות: ₪${summary.totalIncome} | קבועות: ₪${summary.totalFixedExpenses} | משתנות: ₪${summary.totalVariableExpenses}
נשאר לגמישות: ₪${summary.disposableRemaining} | נטו: ₪${summary.netAfterAll}

שורות הכנסה: ${income || "—"}
שורות קבועות: ${fixed || "—"}
שורות משתנות: ${variable || "—"}

ממוצע 6 חודשים: הכנסה ₪${averages.avgIncome.toFixed(0)}, הוצאה ₪${averages.avgExpense.toFixed(0)}
מגמה: ${trendJson}

חריגות שזוהו אוטומטית (הרחב, אל תתעלם):
${detectedJson}

כתוב בעברית. היה חד, אישי, ומצביע על חריגות אמיתיות. כל anomaly חייב action קונקרטי.
healthScore התחלתי: ${healthScore} (תקן אם צריך).

JSON בלבד:
{
  "headline": "משפט אחד חד על המצב",
  "verdict": "2 משפטים — מה טוב ומה מדאיג",
  "healthScore": 0-100,
  "anomalies": [
    { "severity": "alert|warn|info", "title": "...", "detail": "...", "action": "מה לעשות עכשיו" }
  ],
  "focusItems": ["3 דברים לעקוב אחריהם השבוע"]
}`;

  try {
    const ai = await askGeminiJson<BudgetAnalysis>(
      prompt,
      "You are an assertive Hebrew household CFO AI. Flag real anomalies. Never just repeat numbers — interpret and intervene.",
    );
    return {
      ...ai,
      healthScore: Math.max(0, Math.min(100, ai.healthScore ?? healthScore)),
      anomalies: ai.anomalies?.length ? ai.anomalies : fallback.anomalies,
      focusItems: ai.focusItems?.length ? ai.focusItems : fallback.focusItems,
    };
  } catch {
    return fallback;
  }
}

/** @deprecated */
export type SmartInsight = BudgetAnalysis;
export const generateSmartInsights = generateBudgetAnalysis;
