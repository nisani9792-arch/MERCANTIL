import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSql } from "@/lib/db/client";
import { listTemplates } from "@/lib/db/recurring-templates";
import { currentMonthKey } from "@/lib/utils/month";

type SetupItem = {
  name?: string;
  amount?: number;
  type?: "income" | "expense";
  isVariable?: boolean;
};

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
  const items = rawItems.map((item, index) => ({
    id: crypto.randomUUID(),
    name: String(item.name ?? "").trim(),
    amount: Number(item.amount),
    type: item.type,
    isVariable: item.type === "expense" && Boolean(item.isVariable),
    sortOrder: index + 1,
  })).filter((item) => item.name && Number.isFinite(item.amount) && item.amount > 0 && (item.type === "income" || item.type === "expense"));

  if (!items.some((item) => item.type === "income")) {
    return NextResponse.json({ error: "יש להזין לפחות הכנסה אחת" }, { status: 400 });
  }

  const openingCash = Math.max(0, Number(body.openingCash) || 0);
  const monthKey = currentMonthKey();
  const sql = getSql();
  const [{ hasLegacyTemplates }, ledgerRows] = await Promise.all([
    getOptionalTables(),
    sql`select count(*)::int as count from monthly_ledger where user_id = ${session.userId}`,
  ]);
  const isFirstSetup = Number(ledgerRows[0]?.count ?? 0) === 0;
  const itemsJson = JSON.stringify(items);

  const queries = [
    ...(hasLegacyTemplates ? [sql`delete from recurring_templates where user_id = ${session.userId}`] : []),
    sql`delete from fixed_templates where user_id = ${session.userId}`,
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
    `,
    ...(isFirstSetup ? [sql`
      insert into monthly_ledger (
        user_id, month_key, name, type, amount, category,
        is_from_template, template_id, is_variable, is_paid,
        entry_kind, payment_method
      )
      select ${session.userId}, ${monthKey}, x.name, x.type, x.amount,
        case when x.type = 'income' then 'הכנסה' else x.name end,
        true, x.id, x.is_variable, false, 'transaction',
        case when x.type = 'income' then 'bank' else 'card' end
      from jsonb_to_recordset(${itemsJson}::jsonb) as x(
        id uuid, name text, amount numeric, type text,
        is_variable boolean, sort_order int
      )
    `] : []),
    ...(isFirstSetup && openingCash > 0 ? [sql`
      insert into monthly_ledger (
        user_id, month_key, name, type, amount, category,
        is_from_template, is_variable, is_paid, entry_kind, payment_method
      ) values (
        ${session.userId}, ${monthKey}, 'יתרת מזומן התחלתית', 'expense',
        ${openingCash}, 'מזומן', false, false, true, 'cash_withdrawal', 'bank'
      )
    `] : []),
  ];

  try {
    await sql.transaction(queries);
    return NextResponse.json({
      ok: true,
      monthKey,
      templatesCreated: items.length,
      historyPreserved: !isFirstSetup,
    });
  } catch (error) {
    const incidentId = crypto.randomUUID().slice(0, 8);
    console.error(`[setup-save:${incidentId}]`, error);
    return NextResponse.json({ error: "שמירת ההגדרות נכשלה", incidentId }, { status: 500 });
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
