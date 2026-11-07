import {isDate, amount as validAmount} from "@/lib/api/schemas";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createFinancialSnapshotItem, financialItemKinds, listFinancialSnapshotItems, type FinancialItemKind } from "@/lib/db/financial-snapshot";

function validDate(value: unknown) { return value === null || value === undefined || (typeof value === "string" && isDate(value)); }

async function GETHandler() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: await listFinancialSnapshotItems(session.userId) }, { headers: { "Cache-Control": "no-store" } });
}

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJson(request) as Record<string, unknown>;
  if (!body || typeof body !== "object" || (typeof body.notes === "string" && body.notes.length>2000) || (typeof body.institution === "string" && body.institution.length>120)) return NextResponse.json({error:"פרטים אינם תקינים"},{status:400});
  if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 120 || !financialItemKinds.includes(body.kind as FinancialItemKind) ||
    (body.amount !== undefined && body.amount !== null && (!validAmount.safeParse(body.amount).success)) || !validDate(body.dueDate)) {
    return NextResponse.json({ error: "פרטי הכרטיסייה אינם תקינים" }, { status: 400 });
  }
  const item = await createFinancialSnapshotItem(session.userId, {
    kind: body.kind as FinancialItemKind, name: body.name.trim(), institution: typeof body.institution === "string" ? body.institution.trim() || null : null,
    amount: body.amount === undefined || body.amount === null || body.amount === "" ? null : Number(body.amount), dueDate: body.dueDate as string | null,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
  });
  return NextResponse.json({ item }, { status: 201 });
}

export const GET = withApi(GETHandler, "financial-snapshot.get");

export const POST = withApi(POSTHandler, "financial-snapshot.post");
