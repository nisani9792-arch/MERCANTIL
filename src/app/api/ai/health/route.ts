import { NextResponse } from "next/server";
import { isGeminiConfigured, askGemini } from "@/lib/ai/gemini";
import { getSql, isDatabaseConfigured } from "@/lib/db/client";

export async function GET() {
  const status: Record<string, string> = {
    database: "not_configured",
    gemini: "not_configured",
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

  if (isGeminiConfigured()) {
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
  }

  return NextResponse.json({
    ok: status.database !== "error" && status.gemini !== "error",
    services: status,
  });
}
