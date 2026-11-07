import {createHash} from "node:crypto";
import {getSql} from "@/lib/db/client";
import {RouteError} from "@/lib/api/route";

let schema: Promise<void> | undefined;
async function ensureRateLimitSchema() {
  return schema ??= (async () => {
    const sql = getSql();
    const existing = await sql`select to_regclass('public.api_rate_limits') as name`;
    if (existing[0]?.name) return;
    await sql`create table if not exists api_rate_limits (key text primary key, bucket bigint not null, attempts integer not null, expires_at timestamptz not null)`;
    await sql`create index if not exists api_rate_limits_expiry_idx on api_rate_limits(expires_at)`;
  })().catch((error: unknown) => { schema = undefined; throw error; });
}

/** Shared across Workers; a restart cannot reset the attempt count. No raw IP is stored. */
export async function enforceRateLimit(request: Request, scope: string, identity?: string, max = 10, seconds = 600) {
  await ensureRateLimitSchema();
  const key = createHash("sha256").update(`${scope}:${identity ?? request.headers.get("cf-connecting-ip") ?? "unknown"}`).digest("hex");
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const expires = new Date((bucket + 1) * seconds * 1000).toISOString();
  const rows = await getSql()`with expired as (
      delete from api_rate_limits where key in (select key from api_rate_limits where expires_at < now() - interval '1 day' and key <> ${key} limit 100)
    ) insert into api_rate_limits(key,bucket,attempts,expires_at)
    values (${key},${bucket},1,${expires}::timestamptz)
    on conflict(key) do update set bucket=excluded.bucket, expires_at=excluded.expires_at,
      attempts=case when api_rate_limits.bucket=excluded.bucket then api_rate_limits.attempts+1 else 1 end
    returning attempts`;
  if (Number(rows[0]?.attempts) > max) throw new RouteError(429,"RATE_LIMITED","בוצעו יותר מדי ניסיונות. נסה שוב בעוד מספר דקות.", seconds - Math.floor(Date.now()/1000)%seconds);
}
