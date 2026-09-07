import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { askGeminiJson, isGeminiConfigured } from "@/lib/ai/gemini";
import { EXPENSE_CATEGORIES } from "@/lib/constants/budget";

type ParsedEntry = { name: string; amount: number; type: "income" | "expense"; category: string; paymentMethod: "bank" | "card" | "cash"; isVariable: boolean; entryKind: "transaction" | "cash_withdrawal" };

function fallback(text: string): ParsedEntry | null {
  const match = text.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!match) return null;
  const amount = Math.abs(Number(match[1].replace(/,/g, "")));
  if (!amount) return null;
  const isWithdrawal = /משכ|כספומט|atm/i.test(text);
  const isIncome = !isWithdrawal && /משכורת|הכנסה|קיבלתי|זיכוי/i.test(text);
  const paymentMethod = /מזומן/i.test(text) ? "cash" : /העברה|בנק/i.test(text) ? "bank" : "card";
  const category = /סופר|מכולת|אוכל|מזון/i.test(text) ? "מזון" : /דלק|רכב|תחבורה/i.test(text) ? "תחבורה" : /שכירות|ארנונה|חשמל|מים/i.test(text) ? "דיור" : /ילד|גן|בייביסיטר/i.test(text) ? "ילדים" : "אחר";
  return { name: text.replace(match[0], "").replace(/במזומן|באשראי|מהבנק/g, "").trim() || "תנועה חדשה", amount, type: isIncome ? "income" : "expense", category: isIncome ? "הכנסה" : category, paymentMethod: isWithdrawal ? "bank" : paymentMethod, isVariable: !isIncome && !/שכירות|ארנונה|מנוי|ביטוח/i.test(text), entryKind: isWithdrawal ? "cash_withdrawal" : "transaction" };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { text } = await request.json() as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: "טקסט ריק" }, { status: 400 });

  if (isGeminiConfigured()) {
    try {
      const entry = await askGeminiJson<ParsedEntry>(text.trim(), `Parse one Hebrew personal-finance entry. Return JSON only with: name, amount positive number, type income|expense, category, paymentMethod bank|card|cash, isVariable boolean, entryKind transaction|cash_withdrawal. A cash withdrawal is a transfer to the cash wallet, not a regular expense. Allowed expense categories: ${EXPENSE_CATEGORIES.join(", ")}. Keep the Hebrew name short and useful.`);
      if (entry.name?.trim() && Number(entry.amount) > 0 && ["income", "expense"].includes(entry.type) && ["bank", "card", "cash"].includes(entry.paymentMethod) && ["transaction", "cash_withdrawal"].includes(entry.entryKind)) return NextResponse.json({ entry, source: "gemini" });
    } catch (error) { console.warn("[parse-ledger-entry] Gemini fallback", error); }
  }

  const entry = fallback(text.trim());
  if (!entry) return NextResponse.json({ error: "לא זוהה סכום" }, { status: 422 });
  return NextResponse.json({ entry, source: "rules" });
}
