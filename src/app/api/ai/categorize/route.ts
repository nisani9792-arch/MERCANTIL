import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { listCategories, createCategory, findCategoryByName } from "@/lib/db/categories";
import { createTransaction, updateTransactionCategory } from "@/lib/db/transactions";
import { classifyTransactions } from "@/lib/ai/categorize";

const itemSchema = z.object({
  description: z.string().min(1),
  amount: z.number(),
  date: z.string().optional(),
  apply: z.boolean().optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  autoCreateCategories: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = bodySchema.parse(await request.json());
    let categories = await listCategories(session.userId);

    const { results, suggestions } = await classifyTransactions(
      body.items.map((i) => ({
        description: i.description,
        amount: i.amount,
        date: i.date,
      })),
      categories,
    );

    const created: string[] = [];

    if (body.autoCreateCategories && suggestions?.length) {
      for (const s of suggestions) {
        const exists = categories.some((c) => c.name === s.name && c.type === s.type);
        if (!exists) {
          const cat = await createCategory(session.userId, {
            name: s.name,
            type: s.type,
          });
          categories = [...categories, cat];
          created.push(cat.name);
        }
      }
    }

    const applied: string[] = [];

    if (body.items.some((i) => i.apply)) {
      for (let idx = 0; idx < body.items.length; idx++) {
        const item = body.items[idx];
        if (!item.apply) continue;

        const result = results[idx];
        let cat = await findCategoryByName(session.userId, result.categoryName, result.type);
        if (!cat) {
          cat = await createCategory(session.userId, {
            name: result.categoryName,
            type: result.type,
          });
        }

        await createTransaction(session.userId, {
          amount: Math.abs(item.amount),
          date: item.date ?? new Date().toISOString().slice(0, 10),
          categoryId: cat.id,
          notes: result.cleanedNotes,
          accountSource: "ייבוא AI",
        });
        applied.push(result.cleanedNotes);
      }
    }

    return NextResponse.json({ results, suggestions, createdCategories: created, applied });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }
    console.error("[ai/categorize]", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    transactionId?: string;
    categoryId?: string;
  };

  if (!body.transactionId || !body.categoryId) {
    return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
  }

  const ok = await updateTransactionCategory(
    session.userId,
    body.transactionId,
    body.categoryId,
  );

  return NextResponse.json({ ok });
}
