import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteTemplate, updateTemplate } from "@/lib/db/recurring-templates";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    amount?: number;
    frequency?: "monthly" | "bi-monthly";
    dayOfMonth?: number | null;
    isActive?: boolean;
  };

  const template = await updateTemplate(session.userId, id, body);
  if (!template) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json({ template });
}

export async function DELETE(
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
