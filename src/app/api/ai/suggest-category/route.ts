import { enforceRateLimit } from "@/lib/security/rate-limit";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { suggestCategoryName } from "@/lib/ai/categorize";

const schema = z.object({
  description: z.string().min(1),
  type: z.enum(["income", "expense"]),
});

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await enforceRateLimit(request,"ai",session.userId,30,60);

  try {
    const body = schema.parse(await readJson(request));
    const suggestion = await suggestCategoryName(body.description, body.type);
    return NextResponse.json({ suggestion });
  } catch {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
}

export const POST = withApi(POSTHandler, "ai.suggest-category.post");
