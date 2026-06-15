import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listCategories, createCategory } from "@/lib/db/categories";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await listCategories(session.userId);
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    name?: string;
    type?: "income" | "expense";
    icon?: string;
  };

  if (!body.name || !body.type) {
    return NextResponse.json({ error: "חסר שם או סוג" }, { status: 400 });
  }

  const category = await createCategory(session.userId, {
    name: body.name,
    type: body.type,
    icon: body.icon,
  });

  return NextResponse.json({ category }, { status: 201 });
}
