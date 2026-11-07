import { templateUpdate } from "@/lib/api/schemas";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteTemplate, updateTemplate } from "@/lib/db/recurring-templates";

async function PATCHHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = templateUpdate.parse(await readJson(request));

  const template = await updateTemplate(session.userId, id, body);
  if (!template) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json({ template });
}

async function DELETEHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteTemplate(session.userId, id);
  if (!ok) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export const PATCH = withApi(PATCHHandler, "templates.[id].patch");

export const DELETE = withApi(DELETEHandler, "templates.[id].delete");
