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
    type?: "income" | "expense";
    name?: string;
    amount?: number;
    frequency?: "monthly" | "bi-monthly";
    dayOfMonth?: number | null;
    isActive?: boolean;
    isVariable?: boolean;
  };

  if ((body.name !== undefined && !body.name.trim()) ||
      (body.type !== undefined && !["income", "expense"].includes(body.type)) ||
      (body.amount !== undefined && (!Number.isFinite(body.amount) || body.amount <= 0)) ||
      (body.frequency !== undefined && !["monthly", "bi-monthly"].includes(body.frequency)) ||
      (body.isVariable !== undefined && typeof body.isVariable !== "boolean") ||
      (body.dayOfMonth !== undefined && body.dayOfMonth !== null && (!Number.isInteger(body.dayOfMonth) || body.dayOfMonth < 1 || body.dayOfMonth > 31))) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

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
