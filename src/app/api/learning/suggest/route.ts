import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { suggestFromNotes } from "@/lib/db/learning-rules";
import type { CategoryType } from "@/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const notes = searchParams.get("notes") ?? "";
  const type = searchParams.get("type") as CategoryType | null;

  const suggestion = await suggestFromNotes(
    session.userId,
    notes,
    type === "income" || type === "expense" ? type : undefined,
  );

  return NextResponse.json({ suggestion });
}
