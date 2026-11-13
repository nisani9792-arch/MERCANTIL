import { getSql } from "@/lib/db/client";
import { ensureIncomeAmounts } from "@/lib/db/income-amounts";
let ready: Promise<void> | undefined;
export function ensureTemplateCycle() {
  return ready ??= (async () => {
    await ensureIncomeAmounts();
    const sql = getSql();
    const rows = await sql`select exists(select 1 from app_schema_migrations where name='template_cycle_v1') as ready`;
    if (rows[0]?.ready) return;
    await sql.transaction([
      sql`select pg_advisory_xact_lock(742026103)`,
      sql`alter table fixed_templates add column if not exists start_month text`,
      sql`insert into app_schema_migrations(name) values('template_cycle_v1') on conflict do nothing`,
    ]);
  })().catch(error => { ready = undefined; throw error; });
}
