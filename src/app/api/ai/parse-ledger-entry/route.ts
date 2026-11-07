import { z } from "zod";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { logServerError } from "@/lib/api/route";
import { withApi, readJson } from "@/lib/api/route";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { askGeminiJson, isGeminiConfigured } from "@/lib/ai/gemini";
import { EXPENSE_CATEGORIES } from "@/lib/constants/budget";
import { inferExpenseCategory } from "@/lib/ai/smart-category";

type ParsedEntry = { name: string; amount: number; type: "income" | "expense"; category: string; paymentMethod: "bank" | "card" | "cash"; isVariable: boolean; entryKind: "transaction" | "cash_withdrawal" };

function fallback(text: string): ParsedEntry | null {
  const match = text.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!match) return null;
  const amount = Math.abs(Number(match[1].replace(/,/g, "")));
  if (!amount) return null;
  const isWithdrawal = /משיכ(?:ה|ת)|משכתי|כספומט|\batm\b/i.test(text);
  const isIncome = !isWithdrawal && /משכורת|הכנסה|קיבלתי|זיכוי/i.test(text);
  const paymentMethod = isIncome ? "bank" : /מזומן/i.test(text) ? "cash" : /העברה|בנק/i.test(text) ? "bank" : "card";
  const category = inferExpenseCategory(text).category;
  return { name: text.replace(match[0], "").replace(/במזומן|באשראי|מהבנק/g, "").trim() || "תנועה חדשה", amount, type: isIncome ? "income" : "expense", category: isIncome ? "הכנסה" : category, paymentMethod: isWithdrawal ? "bank" : paymentMethod, isVariable: !isIncome && !/שכירות|ארנונה|מנוי|ביטוח/i.test(text), entryKind: isWithdrawal ? "cash_withdrawal" : "transaction" };
}

async function POSTHandler(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await enforceRateLimit(request,"ai",session.userId,30,60);
  const { text } = z.object({text:z.string().trim().min(1).max(2000)}).strict().parse(await readJson(request));
  if (!text?.trim()) return NextResponse.json({ error: "טקסט ריק" }, { status: 400 });

  if (isGeminiConfigured()) {
    try {
      const entry = await askGeminiJson<ParsedEntry>(text.trim(), `Parse one Hebrew personal-finance entry. Return JSON only with: name, amount positive number, type income|expense, category, paymentMethod bank|card|cash, isVariable boolean, entryKind transaction|cash_withdrawal. A cash withdrawal is a transfer to the cash wallet, not a regular expense. Allowed expense categories: ${EXPENSE_CATEGORIES.join(", ")}. Keep the Hebrew name short and useful.`);
      if (typeof entry.name === "string" && entry.name.trim().length <= 120 && typeof entry.amount === "number" && Number.isFinite(entry.amount) && entry.amount > 0 && entry.amount <= 10000000 && typeof entry.isVariable === "boolean" && ["income", "expense"].includes(entry.type) && ["bank", "card", "cash"].includes(entry.paymentMethod) && ["transaction", "cash_withdrawal"].includes(entry.entryKind)) {
        const category = entry.type === "income"
          ? "הכנסה"
          : EXPENSE_CATEGORIES.includes(entry.category as (typeof EXPENSE_CATEGORIES)[number])
            ? entry.category
            : inferExpenseCategory(`${entry.name} ${text}`).category;
        return NextResponse.json({ entry: { ...entry, category }, source: "gemini" });
      }
    } catch (error) { logServerError("[parse-ledger-entry] Gemini fallback", error); }
  }

  const entry = fallback(text.trim());
  if (!entry) return NextResponse.json({ error: "לא זוהה סכום" }, { status: 422 });
  return NextResponse.json({ entry, source: "rules" });
}

export const POST = withApi(POSTHandler, "ai.parse-ledger-entry.post");
