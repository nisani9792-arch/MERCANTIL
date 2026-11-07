import { withApi } from "@/lib/api/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function GETHandler() {
  return NextResponse.json(
    { ok: true, service: "merkanpil", timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export const GET = withApi(GETHandler, "keep-alive.get");
