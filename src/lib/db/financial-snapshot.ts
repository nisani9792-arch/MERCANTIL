import { getSql } from "@/lib/db/client";

export const financialItemKinds = ["account", "savings", "deposit", "planned_expense", "reminder"] as const;
export type FinancialItemKind = (typeof financialItemKinds)[number];

export type FinancialSnapshotItem = {
  id: string;
  user_id: string;
  kind: FinancialItemKind;
  name: string;
  institution: string | null;
  amount: number | null;
  due_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Input = {
  kind: FinancialItemKind;
  name: string;
  institution?: string | null;
  amount?: number | null;
  dueDate?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

function map(row: Record<string, unknown>): FinancialSnapshotItem {
  return {
    id: String(row.id), user_id: String(row.user_id), kind: row.kind as FinancialItemKind,
    name: String(row.name), institution: row.institution ? String(row.institution) : null,
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
    due_date: row.due_date ? String(row.due_date) : null, notes: row.notes ? String(row.notes) : null,
    is_active: Boolean(row.is_active), created_at: String(row.created_at), updated_at: String(row.updated_at),
  };
}

export async function listFinancialSnapshotItems(userId: string) {
  const rows = await getSql()`select * from financial_snapshot_items where user_id = ${userId} order by is_active desc, due_date nulls last, created_at desc`;
  return (rows as Record<string, unknown>[]).map(map);
}

export async function createFinancialSnapshotItem(userId: string, input: Input) {
  const rows = await getSql()`insert into financial_snapshot_items (user_id, kind, name, institution, amount, due_date, notes, is_active)
    values (${userId}, ${input.kind}, ${input.name}, ${input.institution ?? null}, ${input.amount ?? null}, ${input.dueDate ?? null}, ${input.notes ?? null}, ${input.isActive ?? true}) returning *`;
  return map(rows[0] as Record<string, unknown>);
}

export async function updateFinancialSnapshotItem(userId: string, id: string, input: Partial<Input>) {
  const sql = getSql();
  const existing = await sql`select * from financial_snapshot_items where id = ${id} and user_id = ${userId} limit 1`;
  if (!existing.length) return null;
  const cur = map(existing[0] as Record<string, unknown>);
  const rows = await sql`update financial_snapshot_items set
    kind = ${input.kind ?? cur.kind}, name = ${input.name ?? cur.name},
    institution = ${input.institution !== undefined ? input.institution : cur.institution},
    amount = ${input.amount !== undefined ? input.amount : cur.amount},
    due_date = ${input.dueDate !== undefined ? input.dueDate : cur.due_date},
    notes = ${input.notes !== undefined ? input.notes : cur.notes},
    is_active = ${input.isActive !== undefined ? input.isActive : cur.is_active}, updated_at = now()
    where id = ${id} and user_id = ${userId} returning *`;
  return map(rows[0] as Record<string, unknown>);
}

export async function deleteFinancialSnapshotItem(userId: string, id: string) {
  const rows = await getSql()`delete from financial_snapshot_items where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}
