import { categoryCreate } from "@/lib/api/schemas";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listCategories, createCategory } from "@/lib/db/categories";

async function GETHandler() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await listCategories(session.userId);
  return NextResponse.json({ categories });
}

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = categoryCreate.parse(await readJson(request));

  const category = await createCategory(session.userId, {
    name: body.name,
    type: body.type,
    icon: body.icon,
  });

  return NextResponse.json({ category }, { status: 201 });
}

export const GET = withApi(GETHandler, "categories.get");

export const POST = withApi(POSTHandler, "categories.post");
