import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAnalytics } from "@/lib/db/analytics";
import { currentMonthKey } from "@/lib/utils/month";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("month") ?? currentMonthKey();

  const analytics = await getAnalytics(session.userId, monthKey);
  return NextResponse.json(analytics, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
