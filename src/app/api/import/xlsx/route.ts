import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listCategories, createCategory, findCategoryByName } from "@/lib/db/categories";
import { classifyTransactions } from "@/lib/ai/categorize";
import { parseMercantilXlsx, mercantilImportHash } from "@/lib/parsers/mercantil-xlsx";
import { isRelevantTransaction } from "@/lib/filters/household-relevance";
import { getSql } from "@/lib/db/client";
import { ensurePatternsTable, learnPattern } from "@/lib/db/patterns";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "קובץ חסר" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, accountHolder } = await parseMercantilXlsx(buffer);
  if (rows.length === 0) {
    return NextResponse.json({ error: "לא נמצאו תנועות בקובץ" }, { status: 400 });
  }

  await ensurePatternsTable();
  let categories = await listCategories(session.userId);

  const BATCH = 25;
  let imported = 0;
  let skipped = 0;
  let filtered = 0;
  const sql = getSql();

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).filter((r) => {
      if (!isRelevantTransaction(r.description)) {
        filtered++;
        return false;
      }
      return true;
    });
    if (batch.length === 0) continue;

    const { results } = await classifyTransactions(
      batch.map((r) => ({
        description: r.description,
        amount: r.amount,
        date: r.date,
      })),
      categories,
    );

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const result = results[j];
      const hash = mercantilImportHash(row);

      const dup = await sql`
        select id from transactions
        where user_id = ${session.userId} and import_hash = ${hash} limit 1
      `;
      if (dup.length) {
        skipped++;
        continue;
      }

      let cat = await findCategoryByName(session.userId, result.categoryName, result.type);
      if (!cat) {
        cat = await createCategory(session.userId, {
          name: result.categoryName,
          type: result.type,
        });
        categories = [...categories, cat];
      }

      await sql`
        insert into transactions (user_id, amount, date, category_id, account_source, notes, import_hash)
        values (
          ${session.userId},
          ${Math.abs(row.amount)},
          ${row.date}::date,
          ${cat.id},
          ${accountHolder ? `עובר ושב · ${accountHolder}` : "עובר ושב"},
          ${result.cleanedNotes},
          ${hash}
        )
      `;
      await learnPattern(session.userId, row.description, cat.id, "xlsx_upload");
      imported++;
    }
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    filtered,
    total: rows.length,
  });
}
