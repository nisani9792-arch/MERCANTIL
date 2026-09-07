"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import type { LedgerSheetMode } from "@/components/bank/LedgerBottomSheet";

export function SmartEntryBar({ onParsed }: { onParsed: (mode: Extract<LedgerSheetMode, { kind: "add" }>) => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function parse() {
    if (!text.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/ai/parse-ledger-entry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok || !data.entry) throw new Error(data.error || "לא ניתן לנתח");
      const entry = data.entry;
      onParsed({ kind: "add", type: entry.entryKind === "cash_withdrawal" ? "cash_withdrawal" : entry.type, draft: entry });
      setText("");
    } catch (err) { setError(err instanceof Error ? err.message : "לא ניתן לנתח"); }
    finally { setLoading(false); }
  }
  return <section className="smart-entry rounded-[24px] p-3 sm:p-4"><div className="flex items-center gap-2 px-1 pb-2 text-white"><Sparkles className="h-4 w-4 text-emerald-300" /><p className="text-sm font-bold">הזנה חכמה</p><span className="text-xs text-white/55">כתוב בשפה חופשית</span></div><div className="flex gap-2"><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void parse()} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-base text-white outline-none placeholder:text-white/45 focus:border-emerald-300/60" placeholder="לדוגמה: סופר 240 ₪ במזומן" /><button type="button" disabled={!text.trim() || loading} onClick={() => void parse()} className="flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 disabled:opacity-50">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}<span className="hidden sm:inline">ניתוח</span></button></div>{error && <p role="alert" className="mt-2 px-1 text-xs text-red-200">{error}</p>}</section>;
}
