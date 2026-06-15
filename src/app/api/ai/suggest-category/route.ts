import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { suggestCategoryName } from "@/lib/ai/categorize";

const schema = z.object({
  description: z.string().min(1),
  type: z.enum(["income", "expense"]),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const suggestion = await suggestCategoryName(body.description, body.type);
    return NextResponse.json({ suggestion });
  } catch {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }
}
