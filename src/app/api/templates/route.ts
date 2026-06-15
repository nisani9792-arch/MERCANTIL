import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createTemplate,
  listTemplates,
  seedDefaultTemplates,
} from "@/lib/db/recurring-templates";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await seedDefaultTemplates(session.userId);
  const templates = await listTemplates(session.userId);
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    name?: string;
    type?: "income" | "expense";
    amount?: number;
    frequency?: "monthly" | "bi-monthly";
    dayOfMonth?: number | null;
  };

  if (!body.name || !body.type || body.amount == null) {
    return NextResponse.json({ error: "נתונים חסרים" }, { status: 400 });
  }

  const template = await createTemplate(session.userId, {
    name: body.name,
    type: body.type,
    amount: Math.abs(body.amount),
    frequency: body.frequency,
    dayOfMonth: body.dayOfMonth,
  });

  return NextResponse.json({ template }, { status: 201 });
}
