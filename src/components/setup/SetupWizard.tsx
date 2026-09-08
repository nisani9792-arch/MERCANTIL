"use client";

import {
  ArrowLeft,
  Banknote,
  CircleDollarSign,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils/format";
import type { RecurringTemplate } from "@/types/ledger";

type Item = { id: string; name: string; amount: string; isVariable?: boolean };
type SetupResponse = {
  configured: boolean;
  templates: RecurringTemplate[];
  history: { entries: number; months: number };
};

const makeItem = (name = "", amount = "", isVariable = false): Item => ({
  id: crypto.randomUUID(),
  name,
  amount,
  isVariable,
});

const starterIncomes = () => [makeItem("משכורת")];
const starterExpenses = () => [
  makeItem("שכירות / משכנתא"),
  makeItem("חשבונות הבית"),
  makeItem("מזון", "", true),
  makeItem("תחבורה", "", true),
  makeItem("מנויים"),
];

export function SetupWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [incomes, setIncomes] = useState<Item[]>(starterIncomes);
  const [expenses, setExpenses] = useState<Item[]>(starterExpenses);
  const [openingCash, setOpeningCash] = useState("");
  const [configured, setConfigured] = useState(false);
  const [history, setHistory] = useState({ entries: 0, months: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/setup", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({})) as SetupResponse & { error?: string };
        if (!response.ok) throw new Error(data.error || "לא ניתן לטעון את ההגדרות");
        if (!active) return;
        setConfigured(data.configured);
        setHistory(data.history);
        if (data.templates.length) {
          setIncomes(data.templates
            .filter((item) => item.type === "income")
            .map((item) => makeItem(item.name, String(item.amount))));
          setExpenses(data.templates
            .filter((item) => item.type === "expense")
            .map((item) => makeItem(item.name, String(item.amount), item.is_variable)));
        }
      })
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : "לא ניתן לטעון את ההגדרות"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => {
    const income = incomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const expense = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return { income, expense, remaining: income - expense };
  }, [incomes, expenses]);

  const valid = incomes.some((item) =>
    item.name.trim() &&
    item.amount.trim() !== "" &&
    Number.isFinite(Number(item.amount)) &&
    Number(item.amount) >= 0
  );

  async function finish() {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    const items = [
      ...incomes.map((item) => ({ ...item, type: "income" as const, isVariable: false })),
      ...expenses.map((item) => ({ ...item, type: "expense" as const })),
    ]
      .filter((item) => item.name.trim() && item.amount.trim() !== "")
      .map((item) => ({
        name: item.name,
        amount: Number(item.amount),
        type: item.type,
        isVariable: item.isVariable,
      }))
      .filter((item) => Number.isFinite(item.amount) && item.amount >= 0);
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, openingCash: Number(openingCash) || 0 }),
      });
      const data = await response.json().catch(() => ({})) as {
        error?: string;
        incidentId?: string;
        historyPreserved?: boolean;
      };
      if (!response.ok) {
        throw new Error(`${data.error || "לא ניתן להשלים את ההגדרה"}${data.incidentId ? ` (${data.incidentId})` : ""}`);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["templates"] }),
        queryClient.invalidateQueries({ queryKey: ["ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["ai-insights"] }),
      ]);
      setConfigured(true);
      setMessage(data.historyPreserved
        ? "התכנון נשמר. החודשים הקודמים נשארו ללא שינוי."
        : "ההגדרה נשמרה והחודש הראשון נפתח.");
      router.push("/month");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "לא ניתן להשלים את ההגדרה");
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    if (resetting) return;
    const approved = window.confirm(
      "האיפוס ימחק את כל החודשים, התנועות, התבניות והלמידה האישית. פרטי הכניסה יישמרו. להמשיך?",
    );
    if (!approved) return;
    setResetting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/setup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "RESET_ALL_FINANCIAL_DATA" }),
      });
      const data = await response.json().catch(() => ({})) as {
        error?: string;
        incidentId?: string;
        cleared?: { entries: number; months: number };
      };
      if (!response.ok) {
        throw new Error(`${data.error || "האיפוס המלא נכשל"}${data.incidentId ? ` (${data.incidentId})` : ""}`);
      }
      queryClient.clear();
      setConfigured(false);
      setHistory({ entries: 0, months: 0 });
      setIncomes(starterIncomes());
      setExpenses(starterExpenses());
      setOpeningCash("");
      setMessage(`האיפוס הושלם: ${data.cleared?.months ?? 0} חודשים ו־${data.cleared?.entries ?? 0} רשומות נמחקו. עכשיו מגדירים מחדש.`);
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "האיפוס המלא נכשל");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return <div className="mx-auto mt-20 flex max-w-sm flex-col items-center rounded-3xl bg-surface-container-lowest p-7 text-center shadow-elevation-1">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-3 text-sm font-bold">טוען את ההגדרות שלך…</p>
    </div>;
  }

  return <div className="mx-auto max-w-4xl space-y-5 pb-28">
    <header className="text-center">
      <p className="text-xs font-black uppercase tracking-[.18em] text-primary">{configured ? "עריכת תכנון" : "התחלה חכמה"}</p>
      <h1 className="mt-2 text-3xl font-black text-on-surface">{configured ? "אשף ההגדרה שלך" : "מגדירים את החודש הראשון"}</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-on-surface-variant">
        {configured
          ? "שינוי כאן מעדכן את התבנית לחודשים הבאים. החודשים שכבר ניהלת נשמרים בדיוק כפי שהם."
          : "מזינים הערכות בסיסיות, והמערכת תפתח לך חודש מסודר שאפשר לשנות בכל זמן."}
      </p>
    </header>

    {configured && history.months > 0 && <section className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success-container/55 p-3 text-success">
      <ShieldCheck className="h-5 w-5 shrink-0" />
      <p className="text-xs font-bold">שמירה רגילה לא מוחקת היסטוריה: קיימים {history.months} חודשים ו־{history.entries} רשומות.</p>
    </section>}

    {message && <p role="status" className="rounded-xl bg-success-container p-3 text-sm font-bold text-success">{message}</p>}
    {error && <p role="alert" className="rounded-xl bg-error-container p-3 text-sm font-bold text-error">{error}</p>}

    <section className="finance-hero grid grid-cols-3 gap-2 rounded-[28px] p-4 text-center text-white sm:p-5">
      <SetupStat label="הכנסות" value={totals.income} tone="text-emerald-300" />
      <SetupStat label="הוצאות" value={totals.expense} tone="text-sky-300" />
      <SetupStat label="צפוי להישאר" value={totals.remaining} tone={totals.remaining >= 0 ? "text-white" : "text-rose-300"} />
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <SetupList title="הכנסות משוערות" subtitle="משכורת וכל הכנסה שחוזרת" icon={<CircleDollarSign className="h-5 w-5" />} items={incomes} setItems={setIncomes} tone="income" />
      <SetupList title="הוצאות משוערות" subtitle="קבועות ותקציבים משתנים" icon={<Banknote className="h-5 w-5" />} items={expenses} setItems={setExpenses} tone="expense" allowVariable />
    </div>

    {!configured && <section className="finance-panel">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-primary"><WalletCards className="h-5 w-5" /></div><div><h2 className="font-black">מזומן שכבר נמצא אצלך</h2><p className="text-xs text-on-surface-variant">יתרת פתיחה לארנק—לא הוצאה.</p></div></div>
      <input className="m3-input mt-4 w-full px-4 py-3 text-lg font-bold" type="number" inputMode="decimal" min="0" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} placeholder="0 ₪" dir="ltr" />
    </section>}

    <section className="rounded-3xl border border-error/20 bg-error-container/25 p-4">
      <h2 className="text-sm font-black text-error">איפוס מלא</h2>
      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">מוחק את כל החודשים, התנועות, התבניות והלמידה האישית. פרטי הכניסה נשמרים, ולאחר האיפוס האשף נשאר פתוח להתחלה חדשה.</p>
      <button type="button" disabled={resetting} onClick={() => void resetAll()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-error/30 bg-surface-container-lowest px-4 text-sm font-bold text-error sm:w-auto">
        {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        {resetting ? "מאפס את כל הנתונים…" : "איפוס מלא של כל הנתונים"}
      </button>
    </section>

    <div className="sticky bottom-[4.5rem] z-20 rounded-2xl border border-outline-variant bg-surface-container-lowest/95 p-2 shadow-elevation-2 backdrop-blur lg:bottom-3">
      <button type="button" disabled={!valid || saving || resetting} onClick={() => void finish()} className="m3-btn-primary flex min-h-[56px] w-full items-center justify-center gap-2 px-6 text-base">
        {saving ? <><Loader2 className="h-5 w-5 animate-spin" />שומר את התכנון…</> : <>{configured ? "שמירת התכנון" : "שמירה ופתיחת החודש"} <ArrowLeft className="h-5 w-5" /></>}
      </button>
      <p className="mt-1.5 text-center text-[10px] text-on-surface-variant">{configured ? "השמירה משפיעה על חודשים חדשים בלבד." : "אפשר לחזור לאשף ולשנות את התכנון בכל זמן."}</p>
    </div>
  </div>;
}

function SetupStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="min-w-0"><p className="truncate text-[10px] text-white/65 sm:text-xs">{label}</p><p className={`mt-1 truncate text-sm font-black sm:text-xl ${tone}`} dir="ltr">{formatCurrency(value)}</p></div>;
}

function SetupList({ title, subtitle, icon, items, setItems, tone, allowVariable = false }: { title: string; subtitle: string; icon: React.ReactNode; items: Item[]; setItems: React.Dispatch<React.SetStateAction<Item[]>>; tone: "income" | "expense"; allowVariable?: boolean }) {
  const update = (id: string, patch: Partial<Item>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  return <section className="finance-panel !p-0 overflow-hidden"><div className="flex items-center gap-3 border-b border-outline-variant p-4"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone === "income" ? "bg-success-container text-success" : "bg-error-container text-error"}`}>{icon}</div><div><h2 className="font-black">{title}</h2><p className="text-xs text-on-surface-variant">{subtitle}</p></div></div><div className="space-y-3 p-3 sm:p-4">{items.map((item) => <div key={item.id} className="rounded-2xl bg-surface-container/55 p-2.5"><div className="grid grid-cols-[minmax(0,1fr)_6.5rem_2.75rem] gap-2"><input className="m3-input min-w-0 px-3 py-2.5" value={item.name} onChange={(event) => update(item.id, { name: event.target.value })} placeholder={tone === "income" ? "שם ההכנסה" : "שם ההוצאה"} /><input className="m3-input min-w-0 px-2 py-2.5 font-bold" type="number" inputMode="decimal" min="0" value={item.amount} onChange={(event) => update(item.id, { amount: event.target.value })} placeholder="סכום" dir="ltr" /><button type="button" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))} className="flex h-11 w-11 items-center justify-center rounded-xl text-error" aria-label="הסר שורה"><Trash2 className="h-4 w-4" /></button></div>{allowVariable && <label className="mt-2 flex items-center gap-2 px-1 text-xs text-on-surface-variant"><input type="checkbox" checked={item.isVariable} onChange={(event) => update(item.id, { isVariable: event.target.checked })} className="h-4 w-4 accent-primary" />סכום משתנה / תקציב משוער</label>}</div>)}<button type="button" onClick={() => setItems((current) => [...current, makeItem()])} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 text-sm font-bold text-primary"><Plus className="h-4 w-4" />הוספת שורה</button></div></section>;
}
