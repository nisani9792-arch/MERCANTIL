import { neon } from "@neondatabase/serverless";

function normalizeDatabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  let s = raw.trim();
  s = s.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  while (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function getDatabaseUrl(): string | null {
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  return url || null;
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== null;
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL לא מוגדר. העתק .env.local.example ל-.env.local.",
    );
  }
  return neon(url);
}

export type Sql = ReturnType<typeof neon>;
