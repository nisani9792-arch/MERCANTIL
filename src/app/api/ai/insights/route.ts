import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { generateSmartInsights } from "@/lib/ai/budget-insights";
import { getSixMonthTrend } from "@/lib/db/analytics";
import {
  currentMonthKey,
  getLedgerContextForAi,
} from "@/lib/db/monthly-ledger";
import { getHistoricalAverages } from "@/lib/db/analytics";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("month") ?? currentMonthKey();

  const [{ summary, entries }, averages, trend] = await Promise.all([
    getLedgerContextForAi(session.userId, monthKey),
    getHistoricalAverages(session.userId, monthKey),
    getSixMonthTrend(session.userId, monthKey),
  ]);

  const idx = trend.findIndex((t) => t.monthKey === monthKey);
  const priorMonthExpense =
    idx > 0 ? trend[idx - 1].expense : undefined;

  const insights = await generateSmartInsights(
    summary,
    entries,
    averages,
    priorMonthExpense,
  );

  return NextResponse.json({ insights, summary, averages });
}
