import { withApi } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteCategory } from "@/lib/db/categories";

async function DELETEHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteCategory(session.userId, id);
  if (!ok) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export const DELETE = withApi(DELETEHandler, "categories.[id].delete");
