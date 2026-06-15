import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { generateBudgetInsights } from "@/lib/ai/budget-insights";
import {
  currentMonthKey,
  getLedgerContextForAi,
} from "@/lib/db/monthly-ledger";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("month") ?? currentMonthKey();

  const { summary, entries } = await getLedgerContextForAi(
    session.userId,
    monthKey,
  );

  const insights = await generateBudgetInsights(summary, entries);
  return NextResponse.json({ insights, summary });
}
