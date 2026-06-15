import { askGeminiJson, isGeminiConfigured } from "@/lib/ai/gemini";
import {
  createCategory,
  findCategoryByName,
  listCategories,
} from "@/lib/db/categories";
import { listLearningRules } from "@/lib/db/learning-rules";
import { createTransaction } from "@/lib/db/transactions";
import type { CategoryType } from "@/types";

export type ParsedFixedItem = {
  description: string;
  amount: number;
  type: CategoryType;
  categoryName: string;
  isFixedRecurring: boolean;
  date?: string;
};

const SYSTEM_PROMPT = `You are a strict financial parser for a Hebrew household budget app.
The user provides a brain dump of expenses and incomes.
Extract ONLY fixed, recurring financial items (rent, subscriptions, utility bills, car insurance, base salary).
CRITICAL: Filter out and IGNORE variable/one-time expenses (restaurants, shopping, random groceries, coffee, etc.).
Use the user's learning rules for consistent category names when patterns match.
Return JSON: { "items": [{ "description": string, "amount": number, "type": "income"|"expense", "categoryName": string, "isFixedRecurring": true, "date": "YYYY-MM-DD" optional }] }
If nothing qualifies as fixed/recurring, return { "items": [] }.`;

const FALLBACK_RULES: [RegExp, string, CategoryType][] = [
  [/משכורת|salary|שכר/i, "משכורת", "income"],
  [/שכירות|דיור|rent|ארנונה/i, "דיור", "expense"],
  [/ביטוח/i, "ביטוח", "expense"],
  [/netflix|ספוטיפי|מנוי|subscription/i, "מנויים", "expense"],
  [/חשמל|מים|גז|utilities/i, "דיור", "expense"],
  [/דלק|תחבורה|רכב/i, "תחבורה", "expense"],
];

function fallbackParse(text: string): ParsedFixedItem[] {
  const items: ParsedFixedItem[] = [];
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);

  for (const line of lines) {
    const amountMatch = line.match(/(\d[\d,]*(?:\.\d+)?)/);
    if (!amountMatch) continue;
    const amount = Math.abs(Number(amountMatch[1].replace(/,/g, "")));
    if (!amount) continue;

    let categoryName = "אחר";
    let type: CategoryType = "expense";
    for (const [re, cat, t] of FALLBACK_RULES) {
      if (re.test(line)) {
        categoryName = cat;
        type = t;
        break;
      }
    }
    if (/הכנסה|משכורת|salary|זיכוי/i.test(line)) type = "income";

    items.push({
      description: line.replace(amountMatch[0], "").trim() || line,
      amount,
      type,
      categoryName,
      isFixedRecurring: true,
      date: today,
    });
  }
  return items;
}

export async function parseFreeTextBrainDump(
  userId: string,
  text: string,
): Promise<{ items: ParsedFixedItem[]; source: "ai" | "rules" }> {
  const trimmed = text.trim();
  if (!trimmed) return { items: [], source: "rules" };

  const [categories, rules] = await Promise.all([
    listCategories(userId),
    listLearningRules(userId),
  ]);

  const rulesContext = rules
    .map(
      (r) =>
        `- "${r.text_pattern}" → category_id ${r.assigned_category_id}, fixed=${r.is_fixed_recurring}`,
    )
    .join("\n");

  const categoriesContext = categories
    .map((c) => `- ${c.name} (${c.type})`)
    .join("\n");

  if (isGeminiConfigured()) {
    try {
      const result = await askGeminiJson<{ items: ParsedFixedItem[] }>(
        `Brain dump:\n${trimmed}\n\nAvailable categories:\n${categoriesContext}\n\nLearning rules:\n${rulesContext || "(none)"}`,
        SYSTEM_PROMPT,
      );
      const items = (result.items ?? []).filter(
        (i) => i.isFixedRecurring && i.amount > 0 && i.categoryName,
      );
      if (items.length) return { items, source: "ai" };
    } catch {
      /* fallback below */
    }
  }

  return { items: fallbackParse(trimmed), source: "rules" };
}

export async function applyParsedItems(
  userId: string,
  items: ParsedFixedItem[],
): Promise<number> {
  let applied = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const item of items) {
    let cat = await findCategoryByName(userId, item.categoryName, item.type);
    if (!cat) {
      cat = await createCategory(userId, {
        name: item.categoryName,
        type: item.type,
      });
    }

    await createTransaction(userId, {
      amount: item.amount,
      date: item.date ?? today,
      categoryId: cat.id,
      notes: item.description,
      accountSource: "brain-dump",
      isFixedRecurring: true,
    });
    applied++;
  }
  return applied;
}
