import { templateCreate } from "@/lib/api/schemas";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createTemplate,
  listTemplates,
} from "@/lib/db/recurring-templates";

async function GETHandler() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await listTemplates(session.userId);
  return NextResponse.json({ templates });
}

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = templateCreate.parse(await readJson(request));

  const template = await createTemplate(session.userId, {
    name: body.name,
    type: body.type,
    amount: Math.abs(body.amount),
    amountPending: body.amountPending,
    frequency: body.frequency,
    dayOfMonth: body.dayOfMonth,
    isVariable: body.isVariable,
  });

  return NextResponse.json({ template }, { status: 201 });
}

export const GET = withApi(GETHandler, "templates.get");

export const POST = withApi(POSTHandler, "templates.post");
