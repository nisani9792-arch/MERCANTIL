"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BanknoteArrowDown, BanknoteArrowUp, CalendarClock, Edit3, Plus, Power, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatCurrency } from "@/lib/utils/format";
import type { RecurringTemplate } from "@/types/ledger";

type Draft = { id?: string; name: string; amount: string; type: "income" | "expense"; frequency: "monthly" | "bi-monthly"; dayOfMonth: string; isActive: boolean; isVariable: boolean };
const EMPTY_DRAFT: Draft = { name: "", amount: "", type: "expense", frequency: "monthly", dayOfMonth: "", isActive: true, isVariable: false };

export function TemplateList() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [initialDraft, setInitialDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");
  const { data, isLoading, isError } = useQuery({ queryKey: ["templates"], queryFn: async () => {
    const res = await fetch("/api/templates", { cache: "no-store" });
    if (!res.ok) throw new Error("failed");
    return res.json() as Promise<{ templates: RecurringTemplate[] }>;
  }});
  const saveMut = useMutation({ mutationFn: async (value: Draft) => {
    const res = await fetch(value.id ? `/api/templates/${value.id}` : "/api/templates", { method: value.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: value.name.trim(), type: value.type, amount: Number(value.amount), frequency: value.frequency, dayOfMonth: value.dayOfMonth ? Number(value.dayOfMonth) : null, isActive: value.isActive, isVariable: value.isVariable }) });
    const data = await res.json().catch(() => ({})) as { template?: RecurringTemplate; error?: string };
    if (!res.ok || !data.template) throw new Error(data.error || "השמירה לא אושרה על ידי השרת");
  }, onSuccess: async () => { setDraft(null); setInitialDraft(null); setMessage("נשמר בהצלחה"); await qc.invalidateQueries({ queryKey: ["templates"] }); window.setTimeout(() => setMessage(""), 2200); }});
  const actionMut = useMutation({ mutationFn: async ({ id, method, body }: { id: string; method: "PATCH" | "DELETE"; body?: object }) => {
    const res = await fetch(`/api/templates/${id}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error("action failed");
  }, onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }) });

  const templates = data?.templates ?? [];
  const income = templates.filter((item) => item.type === "income");
  const expenses = templates.filter((item) => item.type === "expense");
  const monthly = (items: RecurringTemplate[]) => items.filter((item) => item.is_active).reduce((sum, item) => sum + item.amount / (item.frequency === "bi-monthly" ? 2 : 1), 0);
  const activeIncome = monthly(income); const activeExpenses = monthly(expenses);
  const openDraft = (value: Draft) => { setDraft(value); setInitialDraft(value); };
  const edit = (item: RecurringTemplate) => openDraft({ id: item.id, name: item.name, amount: String(item.amount), type: item.type, frequency: item.frequency, dayOfMonth: item.day_of_month ? String(item.day_of_month) : "", isActive: item.is_active, isVariable: item.is_variable });
  const groupProps = { onEdit: edit, onToggle: (item: RecurringTemplate) => actionMut.mutate({ id: item.id, method: "PATCH", body: { isActive: !item.is_active } }), onDelete: (item: RecurringTemplate) => window.confirm(`למחוק את ${item.name}?`) && actionMut.mutate({ id: item.id, method: "DELETE" }) };

  return <div className="mx-auto max-w-5xl space-y-5 pb-8">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">תכנון אוטומטי</p><h1 className="mt-1 text-2xl font-black text-on-surface">הבסיס של כל חודש</h1><p className="mt-1 text-sm text-on-surface-variant">כל פריט ניתן לעריכה ומשפיע על חודשים חדשים בלבד.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Link href="/setup" className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-outline-variant px-4 text-sm font-bold text-on-surface-variant"><RotateCcw className="h-4 w-4" />איפוס והגדרה מחדש</Link><button type="button" onClick={() => openDraft({ ...EMPTY_DRAFT })} className="m3-btn-primary flex min-h-12 items-center justify-center gap-2 px-5"><Plus className="h-5 w-5" />הוספת פריט קבוע</button></div></div>
    <section className="finance-hero grid gap-4 rounded-[28px] p-5 text-white sm:grid-cols-3 sm:p-6"><PlanStat label="הכנסה חודשית ממוצעת" value={activeIncome} tone="text-emerald-300" /><PlanStat label="הוצאות קבועות ממוצעות" value={activeExpenses} tone="text-sky-300" /><PlanStat label="פנוי לפני הוצאות משתנות" value={activeIncome - activeExpenses} tone={activeIncome >= activeExpenses ? "text-white" : "text-red-300"} /></section>
    {message && <p role="status" className="rounded-xl bg-success-container px-4 py-3 text-sm font-bold text-success">{message}</p>}
    {(isError || saveMut.isError || actionMut.isError) && <p role="alert" className="m3-error rounded-xl bg-error-container p-3">הפעולה נכשלה. אפשר לנסות שוב.</p>}
    {isLoading && <p className="py-10 text-center text-sm text-on-surface-variant">טוען תכנון...</p>}
    <div className="grid gap-5 lg:grid-cols-2"><TemplateGroup title="הכנסות קבועות" subtitle="משכורות והכנסות שחוזרות" items={income} kind="income" {...groupProps} /><TemplateGroup title="הוצאות קבועות" subtitle="חשבונות והתחייבויות" items={expenses} kind="expense" {...groupProps} /></div>
    <BottomSheet
      open={Boolean(draft)}
      onClose={() => { setDraft(null); setInitialDraft(null); }}
      title={draft?.id ? "עריכת פריט קבוע" : "פריט קבוע חדש"}
      dirty={Boolean(draft && initialDraft && JSON.stringify(draft) !== JSON.stringify(initialDraft))}
      footer={draft ? <TemplateSaveButton draft={draft} saving={saveMut.isPending} onSave={() => saveMut.mutate(draft)} /> : undefined}
    >{draft && <TemplateForm draft={draft} setDraft={setDraft} error={saveMut.isError ? saveMut.error.message : undefined} />}</BottomSheet>
  </div>;
}

function PlanStat({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-xs text-white/65">{label}</p><p className={`mt-1 text-2xl font-black ${tone}`} dir="ltr">{formatCurrency(value)}</p></div>; }
function TemplateGroup({ title, subtitle, items, kind, onEdit, onToggle, onDelete }: { title: string; subtitle: string; items: RecurringTemplate[]; kind: "income" | "expense"; onEdit: (item: RecurringTemplate) => void; onToggle: (item: RecurringTemplate) => void; onDelete: (item: RecurringTemplate) => void }) {
  const Icon = kind === "income" ? BanknoteArrowDown : BanknoteArrowUp;
  return <section className="finance-panel !p-0 overflow-hidden"><div className="flex items-center gap-3 border-b border-outline-variant p-4"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${kind === "income" ? "bg-success-container text-success" : "bg-primary-container text-primary"}`}><Icon className="h-5 w-5" /></div><div><h2 className="font-black">{title}</h2><p className="text-xs text-on-surface-variant">{subtitle}</p></div></div><div className="divide-y divide-outline-variant">{items.map((item) => <article key={item.id} className={`flex items-center gap-2 p-3 sm:gap-3 sm:p-4 ${item.is_active ? "" : "opacity-45"}`}><button type="button" className="min-w-0 flex-1 text-start" onClick={() => onEdit(item)}><p className="truncate text-sm font-bold">{item.name}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant"><CalendarClock className="h-3.5 w-3.5" />{item.frequency === "monthly" ? "כל חודש" : "כל חודשיים"}{item.day_of_month ? ` · ביום ${item.day_of_month}` : ""}</p></button><strong className="text-sm" dir="ltr">{formatCurrency(item.amount)}</strong><IconButton label={item.is_active ? "השהה" : "הפעל"} onClick={() => onToggle(item)}><Power className={`h-4 w-4 ${item.is_active ? "text-success" : "text-on-surface-variant"}`} /></IconButton><IconButton label="ערוך" onClick={() => onEdit(item)}><Edit3 className="h-4 w-4 text-primary" /></IconButton><IconButton label="מחק" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4 text-error" /></IconButton></article>)}{!items.length && <p className="p-8 text-center text-sm text-on-surface-variant">אין עדיין פריטים</p>}</div></section>;
}
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-surface-container" aria-label={label}>{children}</button>; }
function TemplateForm({ draft, setDraft, error }: { draft: Draft; setDraft: (value: Draft) => void; error?: string }) {
  return <div className="grid gap-4">{error && <p role="alert" className="rounded-xl bg-error-container p-3 text-sm font-semibold text-error">{error}</p>}<div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-container p-1">{(["expense", "income"] as const).map((type) => <button key={type} type="button" onClick={() => setDraft({ ...draft, type, isVariable: type === "income" ? false : draft.isVariable })} className={`min-h-11 rounded-xl text-sm font-bold ${draft.type === type ? "bg-surface-container-lowest text-primary shadow-elevation-1" : "text-on-surface-variant"}`}>{type === "expense" ? "הוצאה" : "הכנסה"}</button>)}</div><label><span className="m3-label">שם הפריט</span><input autoFocus className="m3-input mt-1 w-full px-3 py-3" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="למשל: שכירות" /></label><div className="grid grid-cols-2 gap-3"><label><span className="m3-label">סכום</span><input className="m3-input mt-1 w-full px-3 py-3" type="number" inputMode="decimal" dir="ltr" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></label><label><span className="m3-label">יום בחודש</span><input className="m3-input mt-1 w-full px-3 py-3" type="number" min="1" max="31" inputMode="numeric" dir="ltr" value={draft.dayOfMonth} onChange={(e) => setDraft({ ...draft, dayOfMonth: e.target.value })} placeholder="אופציונלי" /></label></div><label><span className="m3-label">תדירות</span><select className="m3-input mt-1 w-full px-3 py-3" value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as Draft["frequency"] })}><option value="monthly">כל חודש</option><option value="bi-monthly">כל חודשיים</option></select></label>{draft.type === "expense" && <label className="flex min-h-12 items-center gap-3 rounded-xl bg-surface-container/50 px-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-primary" checked={draft.isVariable} onChange={(e) => setDraft({ ...draft, isVariable: e.target.checked })} />הוצאה משתנה (תקציב משוער)</label>}<label className="flex min-h-12 items-center gap-3 rounded-xl bg-surface-container/50 px-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-primary" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />פעיל בחודשים חדשים</label></div>;
}

function TemplateSaveButton({ draft, saving, onSave }: { draft: Draft; saving: boolean; onSave: () => void }) {
  const day = draft.dayOfMonth ? Number(draft.dayOfMonth) : null;
  const valid = Boolean(draft.name.trim()) && Number(draft.amount) > 0 && (day === null || (day >= 1 && day <= 31));
  return <button type="button" disabled={!valid || saving} onClick={onSave} className="m3-btn-primary min-h-[54px] w-full shadow-elevation-1">{saving ? "שומר שינויים…" : "שמירת השינויים"}</button>;
}
