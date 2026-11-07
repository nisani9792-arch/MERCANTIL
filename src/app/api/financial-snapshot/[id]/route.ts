import {isDate, amount as validAmount} from "@/lib/api/schemas";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteFinancialSnapshotItem, financialItemKinds, type FinancialItemKind, updateFinancialSnapshotItem } from "@/lib/db/financial-snapshot";

function validDate(value: unknown) { return value === null || value === undefined || (typeof value === "string" && isDate(value)); }

async function PATCHHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJson(request) as Record<string, unknown>;
  if (!body || typeof body !== "object" || (typeof body.notes === "string" && body.notes.length>2000) || (typeof body.institution === "string" && body.institution.length>120)) return NextResponse.json({error:"פרטים אינם תקינים"},{status:400});
  if ((body.name !== undefined && (typeof body.name !== "string" || !body.name.trim() || body.name.length > 120)) ||
    (body.kind !== undefined && !financialItemKinds.includes(body.kind as FinancialItemKind)) ||
    (body.amount !== undefined && body.amount !== null && (!validAmount.safeParse(body.amount).success)) ||
    (body.isActive !== undefined && typeof body.isActive !== "boolean") || !validDate(body.dueDate)) return NextResponse.json({ error: "פרטי הכרטיסייה אינם תקינים" }, { status: 400 });
  const { id } = await params;
  const item = await updateFinancialSnapshotItem(session.userId, id, {
    kind: body.kind as FinancialItemKind | undefined, name: body.name as string | undefined,
    institution: body.institution === undefined ? undefined : typeof body.institution === "string" ? body.institution.trim() || null : null,
    amount: body.amount === undefined ? undefined : body.amount === null || body.amount === "" ? null : Number(body.amount),
    dueDate: body.dueDate as string | null | undefined, notes: body.notes === undefined ? undefined : typeof body.notes === "string" ? body.notes.trim() || null : null,
    isActive: body.isActive as boolean | undefined,
  });
  if (!item) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json({ item });
}

async function DELETEHandler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await deleteFinancialSnapshotItem(session.userId, id))) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export const PATCH = withApi(PATCHHandler, "financial-snapshot.[id].patch");

export const DELETE = withApi(DELETEHandler, "financial-snapshot.[id].delete");
