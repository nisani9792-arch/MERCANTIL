import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  applyParsedItems,
  parseFreeTextBrainDump,
} from "@/lib/ai/parse-freetext";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { text?: string; apply?: boolean };
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
    console.error("[ai/parse-freetext]", err);
    return NextResponse.json({ error: "שגיאת ניתוח" }, { status: 500 });
  }
}
