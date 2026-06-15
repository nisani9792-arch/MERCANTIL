import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listCategories } from "@/lib/db/categories";
import { getTransactionsForAi } from "@/lib/db/transactions";
import { generateSmartInsights } from "@/lib/ai/categorize";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [transactions, categories] = await Promise.all([
    getTransactionsForAi(session.userId),
    listCategories(session.userId),
  ]);

  const insights = await generateSmartInsights(transactions, categories);

  return NextResponse.json({ insights });
}
