import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSql } from "@/lib/db/client";
import { listTemplates } from "@/lib/db/recurring-templates";

type SetupItem = {
  id?: string;
  name?: string;
  amount?: number;
  type?: "income" | "expense";
  isVariable?: boolean;
};

function databaseFailureCode(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  if (code === "23503") return "FOREIGN_KEY";
  if (code === "23505") return "DUPLICATE";
  if (code === "23514") return "CONSTRAINT";
  if (code === "22003") return "AMOUNT_RANGE";
  return "DATABASE_WRITE";
}

async function getOptionalTables() {
  const sql = getSql();
  const rows = await sql`
    select
      to_regclass('public.ai_merchant_patterns') is not null as has_patterns,
      to_regclass('public.recurring_templates') is not null as has_legacy_templates
  `;
  return {
    hasPatterns: Boolean(rows[0]?.has_patterns),
    hasLegacyTemplates: Boolean(rows[0]?.has_legacy_templates),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getSql();
  const [templates, ledgerRows] = await Promise.all([
    listTemplates(session.userId),
    sql`
      select count(*)::int as entries, count(distinct month_key)::int as months
      from monthly_ledger where user_id = ${session.userId}
    `,
  ]);

  return NextResponse.json({
    configured: templates.length > 0,
    templates,
    history: {
      entries: Number(ledgerRows[0]?.entries ?? 0),
      months: Number(ledgerRows[0]?.months ?? 0),
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    items?: SetupItem[];
    openingCash?: number;
  };
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 60) : [];
  const sql = getSql();
  const existingTemplates = await listTemplates(session.userId);
  const existingIds = new Set(existingTemplates.map((item) => item.id));
  const items = rawItems.map((item, index) => ({
    id: item.id && existingIds.has(item.id) ? item.id : crypto.randomUUID(),
    name: String(item.name ?? "").trim(),
    amount: Number(item.amount),
    type: item.type,
    // These names intentionally match jsonb_to_recordset below. PostgreSQL
    // does not translate the browser's camelCase fields automatically.
    is_variable: item.type === "expense" && Boolean(item.isVariable),
    sort_order: index + 1,
  })).filter((item) => item.name && Number.isFinite(item.amount) && item.amount >= 0 && (item.type === "income" || item.type === "expense"));

  if (!items.some((item) => item.type === "income")) {
    return NextResponse.json({ error: "יש להזין לפחות הכנסה אחת" }, { status: 400 });
  }

  // The setup wizard owns only the reusable library. It must never rewrite a
  // current month: the user chooses what to bring into every new month.
  void body.openingCash;
  const itemsJson = JSON.stringify(items);

  const queries = [
    sql`
      insert into fixed_templates (
        id, user_id, name, type, amount, frequency, day_of_month,
        is_active, is_variable, sort_order
      )
      select x.id, ${session.userId}, x.name, x.type, x.amount,
        'monthly', null, true, x.is_variable, x.sort_order
      from jsonb_to_recordset(${itemsJson}::jsonb) as x(
        id uuid, name text, amount numeric, type text,
        is_variable boolean, sort_order int
      )
      on conflict (id) do update set
        name = excluded.name,
        type = excluded.type,
        amount = excluded.amount,
        frequency = excluded.frequency,
        day_of_month = excluded.day_of_month,
        is_active = excluded.is_active,
        is_variable = excluded.is_variable,
        sort_order = excluded.sort_order,
        updated_at = now()
      where fixed_templates.user_id = ${session.userId}
    `,
    sql`
      delete from fixed_templates t
      where t.user_id = ${session.userId}
        and not exists (
          select 1 from jsonb_to_recordset(${itemsJson}::jsonb) as x(id uuid)
          where x.id = t.id
        )
    `,
    sql`select count(*)::int as count from fixed_templates where user_id = ${session.userId}`,
  ];

  try {
    const results = await sql.transaction(queries);
    const verificationRows = results.at(-1) as Array<{ count?: number }> | undefined;
    if (Number(verificationRows?.[0]?.count ?? -1) !== items.length) {
      throw new Error("Setup verification failed");
    }
    return NextResponse.json({
      ok: true,
      templatesCreated: items.length,
      historyPreserved: true,
      currentMonthUpdated: false,
    });
  } catch (error) {
    const incidentId = crypto.randomUUID().slice(0, 8);
    const failureCode = databaseFailureCode(error);
    console.error(`[setup-save:${incidentId}:${failureCode}]`, error);
    return NextResponse.json(
      { error: "שמירת ההגדרות נכשלה", incidentId, failureCode },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { confirmation?: string };
  if (body.confirmation !== "RESET_ALL_FINANCIAL_DATA") {
    return NextResponse.json({ error: "נדרש אישור לאיפוס מלא" }, { status: 400 });
  }

  const sql = getSql();
  const { hasPatterns, hasLegacyTemplates } = await getOptionalTables();
  const before = await sql`
    select count(*)::int as entries, count(distinct month_key)::int as months
    from monthly_ledger where user_id = ${session.userId}
  `;

  try {
    await sql.transaction([
      sql`delete from ai_learning_rules where user_id = ${session.userId}`,
      ...(hasPatterns ? [sql`delete from ai_merchant_patterns where user_id = ${session.userId}`] : []),
      sql`delete from transactions where user_id = ${session.userId}`,
      sql`delete from monthly_ledger where user_id = ${session.userId}`,
      sql`delete from fixed_templates where user_id = ${session.userId}`,
      ...(hasLegacyTemplates ? [sql`delete from recurring_templates where user_id = ${session.userId}`] : []),
      sql`delete from categories where user_id = ${session.userId}`,
    ]);

    const remaining = await sql`
      select
        (select count(*) from monthly_ledger where user_id = ${session.userId})::int as ledger,
        (select count(*) from fixed_templates where user_id = ${session.userId})::int as templates,
        (select count(*) from transactions where user_id = ${session.userId})::int as transactions
    `;
    if (Number(remaining[0]?.ledger) || Number(remaining[0]?.templates) || Number(remaining[0]?.transactions)) {
      throw new Error("Reset verification failed");
    }

    return NextResponse.json({
      ok: true,
      cleared: {
        entries: Number(before[0]?.entries ?? 0),
        months: Number(before[0]?.months ?? 0),
      },
    });
  } catch (error) {
    const incidentId = crypto.randomUUID().slice(0, 8);
    console.error(`[setup-reset:${incidentId}]`, error);
    return NextResponse.json({ error: "האיפוס המלא נכשל", incidentId }, { status: 500 });
  }
}
