import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { generateBudgetAnalysis } from "@/lib/ai/budget-insights";
import { getSixMonthTrend, getHistoricalAverages } from "@/lib/db/analytics";
import { listTemplates } from "@/lib/db/recurring-templates";
import {
  currentMonthKey,
  getLedgerContextForAi,
} from "@/lib/db/monthly-ledger";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("month") ?? currentMonthKey();

  const [{ summary, entries }, averages, trend, templates] = await Promise.all([
    getLedgerContextForAi(session.userId, monthKey),
    getHistoricalAverages(session.userId, monthKey),
    getSixMonthTrend(session.userId, monthKey),
    listTemplates(session.userId),
  ]);

  const analysis = await generateBudgetAnalysis(
    summary,
    entries,
    averages,
    trend,
    templates,
  );

  return NextResponse.json(
    { analysis, insights: analysis, summary, averages },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
