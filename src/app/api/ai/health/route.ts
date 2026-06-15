import { NextResponse } from "next/server";
import { isGeminiConfigured, askGemini } from "@/lib/ai/gemini";
import { getSql, isDatabaseConfigured } from "@/lib/db/client";
import { isSessionConfigured } from "@/lib/auth/session";

export async function GET(request: Request) {
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
      const rows = await sql`select version()`;
      status.database = (rows[0] as { version: string }).version.slice(0, 40);
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
