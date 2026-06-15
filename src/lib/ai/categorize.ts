import { askGeminiJson, isGeminiConfigured } from "@/lib/ai/gemini";
import type { Category, CategoryType } from "@/types";

export type ClassifyInput = {
  description: string;
  amount: number;
  date?: string;
};

export type ClassifyResult = {
  categoryName: string;
  type: CategoryType;
  confidence: number;
  cleanedNotes: string;
  isRecurring: boolean;
  tags: string[];
  source: "ai" | "rules";
};

const HEBREW_RULES: { pattern: RegExp; category: string; type: CategoryType }[] = [
  { pattern: /משכורת|salary|שכר|סיטרוק|citro/i, category: "משכורת", type: "income" },
  { pattern: /הפועלים משכורת/i, category: "משכורת", type: "income" },
  { pattern: /ביטוח לאומי.*ילד/i, category: "הכנסה אחרת", type: "income" },
  { pattern: /משרד הבינוי|משרד הבינו|מענק/i, category: "הכנסה אחרת", type: "income" },
  { pattern: /הפקדת שיק|זיכוי/i, category: "הכנסה אחרת", type: "income" },
  { pattern: /העברה|transfer|bit|paybox|הפקדה/i, category: "הכנסה אחרת", type: "income" },
  { pattern: /חיוב.*ויזה|חיוב.*כרטיס|חיוב מיידי|visa|mastercard|max|isracard/i, category: "מנויים", type: "expense" },
  { pattern: /סופר|rami|shufersal|wolt|ten bis|מזון|restaurant|cafe|קפה/i, category: "מזון", type: "expense" },
  { pattern: /דלק|fuel|paz|sonol|delek|תחבורה|rav-kav|רכבת/i, category: "תחבורה", type: "expense" },
  { pattern: /ארנונה|משכנ|שכר דירה|דיור|rent|עמידר/i, category: "דיור", type: "expense" },
  { pattern: /netflix|spotify|apple|google|subscription|מנוי/i, category: "מנויים", type: "expense" },
  { pattern: /ביטוח|insurance|harel|phoenix|menora|מגדל/i, category: "ביטוח", type: "expense" },
  { pattern: /בית מרקחת|pharm|health|כללית|מaccabi|ביקור|רופא/i, category: "בריאות", type: "expense" },
  { pattern: /amazon|aliexpress|ksp|zara|קניות|shop/i, category: "קניות", type: "expense" },
  { pattern: /חינוך|אוניברסיט|מכללה|בית ספר/i, category: "חינוך", type: "expense" },
  { pattern: /עמלה|commission|דמי/i, category: "אחר", type: "expense" },
];

function classifyWithRules(input: ClassifyInput): ClassifyResult {
  const text = input.description;
  const signedAmount = input.amount;

  for (const rule of HEBREW_RULES) {
    if (rule.pattern.test(text)) {
      return {
        categoryName: rule.category,
        type: rule.type,
        confidence: 0.78,
        cleanedNotes: text.trim(),
        isRecurring: /מנוי|subscription|חודשי|monthly|משכורת|ויזה/i.test(text),
        tags: ["mercantil"],
        source: "rules",
      };
    }
  }

  const isIncome = signedAmount > 0;
  return {
    categoryName: isIncome ? "הכנסה אחרת" : "אחר",
    type: isIncome ? "income" : "expense",
    confidence: 0.5,
    cleanedNotes: text.trim(),
    isRecurring: false,
    tags: [],
    source: "rules",
  };
}

type AiBatchResponse = {
  results: {
    index: number;
    categoryName: string;
    type: CategoryType;
    confidence: number;
    cleanedNotes: string;
    isRecurring: boolean;
    tags: string[];
  }[];
  suggestedNewCategories?: { name: string; type: CategoryType; reason: string }[];
};

export async function classifyTransactions(
  inputs: ClassifyInput[],
  availableCategories: Category[],
): Promise<{ results: ClassifyResult[]; suggestions: AiBatchResponse["suggestedNewCategories"] }> {
  if (!isGeminiConfigured()) {
    return {
      results: inputs.map(classifyWithRules),
      suggestions: [],
    };
  }

  const categoryList = availableCategories
    .map((c) => `${c.name} (${c.type})`)
    .join(", ");

  const prompt = JSON.stringify({
    transactions: inputs.map((t, i) => ({
      index: i,
      description: t.description,
      amount: t.amount,
      date: t.date,
    })),
    availableCategories: categoryList,
  });

  try {
    const ai = await askGeminiJson<AiBatchResponse>(
      prompt,
      `You classify Israeli bank transactions in Hebrew.
Return JSON with:
- results[]: index, categoryName (must match available or suggest logical Hebrew name), type (income|expense), confidence 0-1, cleanedNotes (human readable Hebrew), isRecurring, tags[]
- suggestedNewCategories[]: optional new categories if none fit well
Detect: subscriptions, duplicate charges, salary, transfers, card charges.
Prefer existing categories. Handle mixed Hebrew/English bank strings.`,
    );

    const results = inputs.map((input, i) => {
      const match = ai.results.find((r) => r.index === i);
      if (!match) return classifyWithRules(input);
      return { ...match, source: "ai" as const };
    });

    return { results, suggestions: ai.suggestedNewCategories ?? [] };
  } catch {
    return {
      results: inputs.map(classifyWithRules),
      suggestions: [],
    };
  }
}

export async function classifySingle(
  input: ClassifyInput,
  categories: Category[],
): Promise<ClassifyResult> {
  const { results } = await classifyTransactions([input], categories);
  return results[0];
}

export type SmartInsight = {
  id: string;
  type: "tip" | "warning" | "recurring" | "duplicate" | "saving";
  title: string;
  body: string;
  severity: "info" | "warn" | "success";
};

export async function generateSmartInsights(
  transactions: Awaited<ReturnType<typeof import("@/lib/db/transactions").getTransactionsForAi>>,
  categories: Category[],
): Promise<SmartInsight[]> {
  const insights: SmartInsight[] = [];

  const byDesc = new Map<string, { count: number; total: number; dates: string[] }>();
  for (const t of transactions) {
    const key = (t.notes ?? t.account_source ?? "").slice(0, 40).toLowerCase();
    if (!key) continue;
    const entry = byDesc.get(key) ?? { count: 0, total: 0, dates: [] };
    entry.count++;
    entry.total += Number(t.amount);
    entry.dates.push(String(t.date));
    byDesc.set(key, entry);
  }

  for (const [desc, data] of byDesc) {
    if (data.count >= 2 && data.dates.length >= 2) {
      insights.push({
        id: `recurring-${desc.slice(0, 12)}`,
        type: "recurring",
        title: "תשלום חוזר זוהה",
        body: `"${desc}" — ${data.count} חיובים בסך ${data.total.toFixed(0)} ₪. שקול לבדוק אם זה מנוי.`,
        severity: "info",
      });
    }
  }

  const monthExpense = transactions
    .filter((t) => t.category_type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  if (monthExpense > 0) {
    insights.push({
      id: "expense-overview",
      type: "tip",
      title: "סיכום הוצאות",
      body: `סך הוצאות שנרשמו: ${monthExpense.toFixed(0)} ₪. השתמש בסיווג AI לדיוק טוב יותר.`,
      severity: "info",
    });
  }

  if (!isGeminiConfigured()) return insights.slice(0, 5);

  try {
    const ai = await askGeminiJson<{ insights: SmartInsight[] }>(
      JSON.stringify({ transactions: transactions.slice(0, 30), categories: categories.map((c) => c.name) }),
      `Analyze Israeli personal finance data. Return JSON: insights[] with id, type (tip|warning|recurring|duplicate|saving), title and body in Hebrew, severity (info|warn|success).
Find: overspending vs categories, duplicate charges, subscription creep, saving opportunities. Max 4 insights.`,
    );
    return [...insights, ...(ai.insights ?? [])].slice(0, 6);
  } catch {
    return insights.slice(0, 5);
  }
}

export async function suggestCategoryName(
  description: string,
  type: CategoryType,
): Promise<{ name: string; icon: string; reason: string }> {
  if (!isGeminiConfigured()) {
    return { name: description.slice(0, 20) || "קטגוריה חדשה", icon: "circle", reason: "הצעה אוטומטית" };
  }

  try {
    return await askGeminiJson(
      JSON.stringify({ description, type }),
      `Suggest a short Hebrew category name for this expense/income. Return JSON: name, icon (lucide icon name), reason in Hebrew.`,
    );
  } catch {
    return { name: "קטגוריה מותאמת", icon: "circle", reason: "לא ניתן לפנות ל-AI" };
  }
}
