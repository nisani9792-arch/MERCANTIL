import { getSql } from "@/lib/db/client";

export async function hasFinancialSetup(userId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    select exists (
      select 1 from fixed_templates where user_id = ${userId}
    ) as configured
  `;
  return Boolean(rows[0]?.configured);
}
