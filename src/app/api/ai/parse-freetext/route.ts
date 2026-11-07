import { z } from "zod";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/api/route";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  applyParsedItems,
  parseFreeTextBrainDump,
} from "@/lib/ai/parse-freetext";

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await enforceRateLimit(request,"ai",session.userId,30,60);

  const body = z.object({text:z.string().trim().min(1).max(8000),apply:z.boolean().optional()}).strict().parse(await readJson(request));
  const text = body.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "טקסט ריק" }, { status: 400 });
  }

  try {
    const { items, source } = await parseFreeTextBrainDump(session.userId, text);

    if (body.apply) {
      const applied = await applyParsedItems(session.userId, items);
      return NextResponse.json({ items, source, applied });
    }

    return NextResponse.json({ items, source });
  } catch (err) {
    logServerError("[ai/parse-freetext]", err);
    return NextResponse.json({ error: "שגיאת ניתוח" }, { status: 500 });
  }
}

export const POST = withApi(POSTHandler, "ai.parse-freetext.post");
