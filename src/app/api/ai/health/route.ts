import { getSession } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { withApi } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { isGeminiConfigured, askGemini } from "@/lib/ai/gemini";
import { getSql, isDatabaseConfigured } from "@/lib/db/client";
import { isSessionConfigured } from "@/lib/auth/session";

async function GETHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({error:"Unauthorized"},{status:401});
  await enforceRateLimit(request,"ai.health",session.userId,5,300);
  const { searchParams } = new URL(request.url);
  const full = searchParams.get("full") === "1";

  const status: Record<string, string> = {
    database: "not_configured",
    session: isSessionConfigured() ? "configured" : "missing",
    gemini: "skipped",
  };

  if (isDatabaseConfigured()) {
    try {
      const sql = getSql();
      await sql`select 1`;
      status.database = "connected";
    } catch {
      status.database = "error";
    }
  }

  if (full && isGeminiConfigured()) {
    try {
      const reply = await askGemini(
        'Respond with exactly one word: "ready"',
        "You are a health check assistant.",
      );
      status.gemini = reply.trim().toLowerCase().includes("ready")
        ? "ready"
        : "connected";
    } catch {
      status.gemini = "error";
    }
  } else if (isGeminiConfigured()) {
    status.gemini = "configured";
  }

  const ok =
    status.database !== "error" &&
    status.session === "configured" &&
    status.gemini !== "error";

  return NextResponse.json({ ok, services: status });
}

export const GET = withApi(GETHandler, "ai.health.get");
