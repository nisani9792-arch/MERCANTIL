import type {
  FixedTemplate,
  HistoricalAverages,
  MonthSummary,
  MonthTrendPoint,
  MonthlyLedgerEntry,
} from "@/types/ledger";

export type DetectedAnomaly = {
  severity: "alert" | "warn" | "info";
  title: string;
  detail: string;
  item?: string;
};

export function detectAnomalies(
  summary: MonthSummary,
  entries: MonthlyLedgerEntry[],
  averages: HistoricalAverages,
  trend: MonthTrendPoint[],
  templates: FixedTemplate[],
): DetectedAnomaly[] {
  const flags: DetectedAnomaly[] = [];
  const totalExpense =
    summary.totalFixedExpenses + summary.totalVariableExpenses;

  if (summary.disposableRemaining < 0) {
    flags.push({
      severity: "alert",
      title: "חריגה מהתקציב המשתנה",
      detail: `הוצאת ₪${Math.abs(summary.disposableRemaining).toFixed(0)} מעל מה שנשאר אחרי הקבועות.`,
    });
  }

  if (summary.totalIncome > 0 && totalExpense / summary.totalIncome > 0.95) {
    flags.push({
      severity: "alert",
      title: "95%+ מההכנסה נעלמת",
      detail: `סה״כ הוצאות ₪${totalExpense.toFixed(0)} מול הכנסות ₪${summary.totalIncome.toFixed(0)}.`,
    });
  }

  if (
    summary.totalIncome > 0 &&
    summary.totalFixedExpenses / summary.totalIncome > 0.65
  ) {
    flags.push({
      severity: "warn",
      title: "הקבועות כבדות מדי",
      detail: `${((summary.totalFixedExpenses / summary.totalIncome) * 100).toFixed(0)}% מההכנסה הולך להוצאות קבועות.`,
    });
  }

  if (averages.avgExpense > 0) {
    const delta =
      ((totalExpense - averages.avgExpense) / averages.avgExpense) * 100;
    if (delta > 12) {
      flags.push({
        severity: "warn",
        title: "הוצאות גבוהות מהרגיל",
        detail: `החודש גבוה ב-${delta.toFixed(0)}% מהממוצע של ${averages.monthsIncluded} חודשים.`,
      });
    } else if (delta < -12) {
      flags.push({
        severity: "info",
        title: "הוצאות נמוכות מהרגיל",
        detail: `חסכת כ-${Math.abs(delta).toFixed(0)}% לעומת הממוצע החודשי.`,
      });
    }
  }

  if (averages.avgIncome > 0) {
    const incomeDelta =
      ((summary.totalIncome - averages.avgIncome) / averages.avgIncome) * 100;
    if (incomeDelta < -8) {
      flags.push({
        severity: "warn",
        title: "ירידה בהכנסות",
        detail: `הכנסות נמוכות ב-${Math.abs(incomeDelta).toFixed(0)}% מהממוצע.`,
      });
    }
  }

  const templateById = new Map(templates.map((t) => [t.id, t]));
  for (const entry of entries) {
    if (entry.type !== "expense" || !entry.is_from_template || !entry.template_id)
      continue;
    const tpl = templateById.get(entry.template_id);
    if (!tpl || tpl.amount <= 0) continue;
    const drift = ((entry.amount - tpl.amount) / tpl.amount) * 100;
    if (Math.abs(drift) >= 8) {
      flags.push({
        severity: drift > 0 ? "warn" : "info",
        title: `${entry.name} — סטייה מהבסיס`,
        detail: `₪${entry.amount} לעומת תבנית ₪${tpl.amount} (${drift > 0 ? "+" : ""}${drift.toFixed(0)}%).`,
        item: entry.name,
      });
    }
  }

  const prior = trend.filter((t) => t.monthKey < summary.monthKey).at(-1);
  if (prior && prior.expense > 0) {
    const mom = ((totalExpense - prior.expense) / prior.expense) * 100;
    if (mom > 15) {
      flags.push({
        severity: "warn",
        title: "קפיצה מהחודש הקודם",
        detail: `הוצאות עלו ${mom.toFixed(0)}% לעומת ${prior.monthKey}.`,
      });
    }
  }

  const bigItems = entries
    .filter((e) => e.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  for (const item of bigItems) {
    if (summary.totalIncome > 0 && item.amount / summary.totalIncome > 0.25) {
      flags.push({
        severity: "warn",
        title: `${item.name} — פריט דומיננטי`,
        detail: `₪${item.amount} = ${((item.amount / summary.totalIncome) * 100).toFixed(0)}% מההכנסה.`,
        item: item.name,
      });
    }
  }

  return flags.slice(0, 8);
}

export function computeHealthScore(
  summary: MonthSummary,
  anomalies: DetectedAnomaly[],
): number {
  let score = 100;
  for (const a of anomalies) {
    if (a.severity === "alert") score -= 22;
    else if (a.severity === "warn") score -= 12;
    else score -= 4;
  }
  if (summary.disposableRemaining < 0) score -= 15;
  if (summary.netAfterAll < 0) score -= 10;
  return Math.max(0, Math.min(100, score));
}
