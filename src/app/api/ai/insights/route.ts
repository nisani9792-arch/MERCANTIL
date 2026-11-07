import { month } from "@/lib/api/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { withApi } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { generateBudgetAnalysis } from "@/lib/ai/budget-insights";
import { getSixMonthTrend, getHistoricalAveragesFromTrend } from "@/lib/db/analytics";
import { listTemplates } from "@/lib/db/recurring-templates";
import {
  currentMonthKey,
  getLedgerContextForAi,
} from "@/lib/db/monthly-ledger";

async function GETHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await enforceRateLimit(request,"ai",session.userId,30,60);

  const { searchParams } = new URL(request.url);
  const monthKey = month.parse(searchParams.get("month") ?? currentMonthKey());

  const [{ summary, entries }, trend, templates] = await Promise.all([
    getLedgerContextForAi(session.userId, monthKey),
    getSixMonthTrend(session.userId, monthKey),
    listTemplates(session.userId),
  ]);
  const averages = getHistoricalAveragesFromTrend(trend);

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

export const GET = withApi(GETHandler, "ai.insights.get");
