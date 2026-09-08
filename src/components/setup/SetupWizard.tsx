"use client";

import { ArrowLeft, Banknote, CircleDollarSign, Plus, Trash2, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils/format";

type Item = { id: string; name: string; amount: string; isVariable?: boolean };
const makeItem = (name = "", amount = "", isVariable = false): Item => ({ id: crypto.randomUUID(), name, amount, isVariable });

export function SetupWizard() {
  const router = useRouter();
  const [incomes, setIncomes] = useState<Item[]>([makeItem("משכורת")]);
  const [expenses, setExpenses] = useState<Item[]>([
    makeItem("שכירות / משכנתא"),
    makeItem("חשבונות הבית"),
    makeItem("מזון", "", true),
    makeItem("תחבורה", "", true),
    makeItem("מנויים"),
  ]);
  const [openingCash, setOpeningCash] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const income = incomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const expense = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return { income, expense, remaining: income - expense };
  }, [incomes, expenses]);

  const valid = incomes.some((item) => item.name.trim() && Number(item.amount) > 0);

  async function finish() {
    if (!valid || saving) return;
    setSaving(true); setError("");
    const items = [
      ...incomes.map((item) => ({ name: item.name, amount: Number(item.amount), type: "income" as const, isVariable: false })),
      ...expenses.map((item) => ({ name: item.name, amount: Number(item.amount), type: "expense" as const, isVariable: item.isVariable })),
    ].filter((item) => item.name.trim() && item.amount > 0);
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "RESET_AND_SETUP", items, openingCash: Number(openingCash) || 0 }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; incidentId?: string };
      if (!response.ok) throw new Error(`${data.error || "לא ניתן להשלים את ההגדרה"}${data.incidentId ? ` (${data.incidentId})` : ""}`);
      router.push("/month");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "לא ניתן להשלים את ההגדרה");
    } finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-4xl space-y-5 pb-24">
    <header className="text-center">
      <p className="text-xs font-black uppercase tracking-[.18em] text-primary">התחלה נקייה</p>
      <h1 className="mt-2 text-3xl font-black text-on-surface">מגדירים את החודש שלך</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-on-surface-variant">מזינים הערכות בלבד. אפשר לשנות כל סכום בחודש עצמו בלי לפגוע בתבנית העתידית.</p>
    </header>

    <section className="finance-hero grid grid-cols-3 gap-2 rounded-[28px] p-4 text-center text-white sm:p-5">
      <SetupStat label="הכנסות" value={totals.income} tone="text-emerald-300" />
      <SetupStat label="הוצאות" value={totals.expense} tone="text-sky-300" />
      <SetupStat label="צפוי להישאר" value={totals.remaining} tone={totals.remaining >= 0 ? "text-white" : "text-rose-300"} />
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <SetupList title="הכנסות משוערות" subtitle="משכורת וכל הכנסה שחוזרת" icon={<CircleDollarSign className="h-5 w-5" />} items={incomes} setItems={setIncomes} tone="income" />
      <SetupList title="הוצאות משוערות" subtitle="קבועות ותקציבים משתנים" icon={<Banknote className="h-5 w-5" />} items={expenses} setItems={setExpenses} tone="expense" allowVariable />
    </div>

    <section className="finance-panel">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-primary"><WalletCards className="h-5 w-5" /></div><div><h2 className="font-black">מזומן שכבר נמצא אצלך</h2><p className="text-xs text-on-surface-variant">לא ייחשב כהוצאה—זו יתרת פתיחה לארנק.</p></div></div>
      <input className="m3-input mt-4 w-full px-4 py-3 text-lg font-bold" type="number" inputMode="decimal" min="0" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} placeholder="0 ₪" dir="ltr" />
    </section>

    {error && <p role="alert" className="rounded-xl bg-error-container p-3 text-sm font-bold text-error">{error}</p>}
    <div className="sticky bottom-[4.5rem] z-20 rounded-2xl border border-outline-variant bg-surface-container-lowest/95 p-2 shadow-elevation-2 backdrop-blur lg:bottom-3">
      <button type="button" disabled={!valid || saving} onClick={() => void finish()} className="m3-btn-primary flex min-h-[56px] w-full items-center justify-center gap-2 px-6 text-base">
        {saving ? "מאפס ומגדיר…" : <>איפוס הנתונים ופתיחת חודש חדש <ArrowLeft className="h-5 w-5" /></>}
      </button>
      <p className="mt-1.5 text-center text-[10px] text-on-surface-variant">הפעולה מוחקת את נתוני הכספים הקודמים. פרטי הכניסה נשמרים.</p>
    </div>
  </div>;
}

function SetupStat({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="min-w-0"><p className="truncate text-[10px] text-white/65 sm:text-xs">{label}</p><p className={`mt-1 truncate text-sm font-black sm:text-xl ${tone}`} dir="ltr">{formatCurrency(value)}</p></div>; }

function SetupList({ title, subtitle, icon, items, setItems, tone, allowVariable = false }: { title: string; subtitle: string; icon: React.ReactNode; items: Item[]; setItems: React.Dispatch<React.SetStateAction<Item[]>>; tone: "income" | "expense"; allowVariable?: boolean }) {
  const update = (id: string, patch: Partial<Item>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  return <section className="finance-panel !p-0 overflow-hidden"><div className="flex items-center gap-3 border-b border-outline-variant p-4"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone === "income" ? "bg-success-container text-success" : "bg-error-container text-error"}`}>{icon}</div><div><h2 className="font-black">{title}</h2><p className="text-xs text-on-surface-variant">{subtitle}</p></div></div><div className="space-y-3 p-3 sm:p-4">{items.map((item) => <div key={item.id} className="rounded-2xl bg-surface-container/55 p-2.5"><div className="flex gap-2"><input className="m3-input min-w-0 flex-1 px-3 py-2.5" value={item.name} onChange={(event) => update(item.id, { name: event.target.value })} placeholder={tone === "income" ? "שם ההכנסה" : "שם ההוצאה"} /><input className="m3-input w-28 px-3 py-2.5 font-bold" type="number" inputMode="decimal" min="0" value={item.amount} onChange={(event) => update(item.id, { amount: event.target.value })} placeholder="סכום" dir="ltr" /><button type="button" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-error" aria-label="הסר שורה"><Trash2 className="h-4 w-4" /></button></div>{allowVariable && <label className="mt-2 flex items-center gap-2 px-1 text-xs text-on-surface-variant"><input type="checkbox" checked={item.isVariable} onChange={(event) => update(item.id, { isVariable: event.target.checked })} className="h-4 w-4 accent-primary" />סכום משתנה / תקציב משוער</label>}</div>)}<button type="button" onClick={() => setItems((current) => [...current, makeItem()])} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 text-sm font-bold text-primary"><Plus className="h-4 w-4" />הוספת שורה</button></div></section>;
}

