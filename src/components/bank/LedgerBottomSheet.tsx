"use client";
/* eslint-disable react-hooks/set-state-in-effect -- reset form state when a different ledger item opens */

import { CopyPlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EXPENSE_CATEGORIES } from "@/lib/constants/budget";
import { inferExpenseCategory } from "@/lib/ai/smart-category";
import type { LedgerEntryKind, LedgerItemType, MonthlyLedgerEntry, PaymentMethod } from "@/types/ledger";

type AddType = LedgerItemType | "cash_withdrawal";

export type LedgerSheetMode =
  | { kind: "add"; type: AddType; draft?: Partial<{ name: string; amount: number; category: string; isVariable: boolean; paymentMethod: PaymentMethod }> }
  | { kind: "edit"; entry: MonthlyLedgerEntry };

type LedgerBottomSheetProps = {
  open: boolean;
  mode: LedgerSheetMode | null;
  storageScope: string;
  onClose: () => void;
  onDelete?: () => Promise<void>;
  onTogglePaid?: () => Promise<void>;
  onCreateTemplate?: (data: { frequency: "monthly" | "bi-monthly"; dayOfMonth: number | null }) => Promise<{ created: boolean }>;
  onSave: (data: {
    name: string;
    amount: number;
    type: LedgerItemType;
    category: string;
    isVariable: boolean;
    entryKind: LedgerEntryKind;
    paymentMethod: PaymentMethod;
    dueDate: string | null;
  }) => Promise<void>;
  saving?: boolean;
  error?: string;
};

export function LedgerBottomSheet({
  open,
  mode,
  storageScope,
  onClose,
  onDelete,
  onTogglePaid,
  onCreateTemplate,
  onSave,
  saving,
  error,
}: LedgerBottomSheetProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("אחר");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [isVariable, setIsVariable] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [dueDate, setDueDate] = useState("");
  const [readyDraftKey, setReadyDraftKey] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templateFrequency, setTemplateFrequency] = useState<"monthly" | "bi-monthly">("monthly");
  const [templateDay, setTemplateDay] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  const [togglingPaid, setTogglingPaid] = useState(false);

  useEffect(() => {
    if (!mode) return;
    const draftKey = getDraftKey(storageScope, mode);
    let restored: Partial<{
      name: string;
      amount: string;
      category: string;
      isVariable: boolean;
      paymentMethod: PaymentMethod;
      dueDate: string;
    }> = {};
    try {
      restored = JSON.parse(localStorage.getItem(draftKey) ?? "{}");
    } catch {
      localStorage.removeItem(draftKey);
    }
    if (mode.kind === "edit") {
      setName(restored.name ?? mode.entry.name);
      setAmount(restored.amount ?? String(mode.entry.amount));
      setCategory(restored.category ?? mode.entry.category);
      setIsVariable(restored.isVariable ?? mode.entry.is_variable);
      setPaymentMethod(restored.paymentMethod ?? mode.entry.payment_method);
      setDueDate(restored.dueDate ?? mode.entry.due_date ?? "");
      setTemplateDay(mode.entry.due_date?.slice(8, 10).replace(/^0/, "") ?? "");
      setTemplateMessage("");
      setCategoryTouched(true);
    } else {
      setName(restored.name ?? mode.draft?.name ?? "");
      setAmount(restored.amount ?? (mode.draft?.amount !== undefined ? String(mode.draft.amount) : ""));
      setCategory(restored.category ?? mode.draft?.category ?? (mode.type === "expense" ? "מזון" : "הכנסה"));
      setIsVariable(restored.isVariable ?? mode.draft?.isVariable ?? mode.type === "expense");
      setPaymentMethod(restored.paymentMethod ?? mode.draft?.paymentMethod ?? (mode.type === "expense" ? "card" : "bank"));
      setDueDate(restored.dueDate ?? "");
      setCategoryTouched(Boolean(mode.draft?.category));
    }
    setReadyDraftKey(draftKey);
  }, [mode, storageScope]);

  useEffect(() => {
    if (!open || !mode) return;
    const draftKey = getDraftKey(storageScope, mode);
    if (readyDraftKey !== draftKey) return;
    localStorage.setItem(draftKey, JSON.stringify({
      name,
      amount,
      category,
      isVariable,
      paymentMethod,
      dueDate,
    }));
  }, [amount, category, dueDate, isVariable, mode, name, open, paymentMethod, readyDraftKey, storageScope]);

  if (!mode) return null;

  const isWithdrawal =
    (mode.kind === "add" && mode.type === "cash_withdrawal") ||
    (mode.kind === "edit" && mode.entry.entry_kind === "cash_withdrawal");
  const type: LedgerItemType =
    mode.kind === "edit"
      ? mode.entry.type
      : mode.type === "cash_withdrawal"
        ? "expense"
        : mode.type;
  const title =
    mode.kind === "edit"
      ? "עריכת רישום"
      : isWithdrawal
        ? "משיכת מזומן"
        : type === "income"
        ? "הוספת הכנסה"
        : "הוספת הוצאה";
  const categoryGuess = inferExpenseCategory(name);
  const valid = Boolean(name.trim()) && amount.trim() !== "" && Number.isFinite(Number(amount)) && Number(amount) >= 0;
  const dirty = mode.kind === "edit"
    ? name !== mode.entry.name || amount !== String(mode.entry.amount) || category !== mode.entry.category || isVariable !== mode.entry.is_variable || paymentMethod !== mode.entry.payment_method || dueDate !== (mode.entry.due_date ?? "")
    : Boolean(name.trim() || amount);

  const saveButton = (
    <button
      type="button"
      disabled={!valid || saving}
      onClick={async () => {
        try {
          await onSave({
            name: name.trim(),
            amount: Number(amount),
            type,
            category: type === "income" ? "הכנסה" : category,
            isVariable: type === "expense" && isVariable,
            entryKind: isWithdrawal ? "cash_withdrawal" : "transaction",
            paymentMethod: isWithdrawal ? "bank" : paymentMethod,
            dueDate: dueDate || null,
          });
          localStorage.removeItem(getDraftKey(storageScope, mode));
        } catch {
          // The parent displays the server error. Keep the local draft intact.
        }
      }}
      className="m3-btn-primary min-h-[54px] w-full py-3 text-base shadow-elevation-1"
    >
      {saving ? "שומר שינויים…" : mode.kind === "edit" ? "שמירת השינויים" : "שמירת התנועה"}
    </button>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={title} dirty={dirty && !saving} footer={saveButton}>
      {mode.kind === "edit" && <p className="mb-4 rounded-xl bg-primary-container p-3 text-sm text-primary">השינוי בשם ובסכום נשמר לחודש הזה בלבד. התבנית הקבועה לא תשתנה.</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-error-container p-3 text-sm font-semibold text-error">{error}</p>}
      <p className="mb-3 text-xs text-on-surface-variant">הטיוטה נשמרת אוטומטית במכשיר עד שהשרת מאשר את השמירה.</p>
      <div className="grid gap-3">
        <div>
          <label className="m3-label">שם</label>
          <input
            className="m3-input mt-1 w-full px-3 py-3 text-base"
            value={name}
            onChange={(e) => {
              const value = e.target.value;
              setName(value);
              if (mode.kind === "add" && type === "expense" && !categoryTouched) {
                setCategory(inferExpenseCategory(value).category);
              }
            }}
            placeholder={isWithdrawal ? "למשל: משיכה מהכספומט" : "למשל: סופר, משכורת..."}
          />
        </div>
        {!isWithdrawal && (
          <div>
            <label className="m3-label">מועד לביצוע (אופציונלי)</label>
            <input
              className="m3-input mt-1 w-full px-3 py-3 text-base"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-on-surface-variant">תנועה שלא סומנה כבוצעה תופיע כקרובה בשבעת הימים שלפני המועד.</p>
          </div>
        )}
        <div>
          <label className="m3-label">סכום (₪)</label>
          <input
            className="m3-input mt-1 w-full px-3 py-3 text-base"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            dir="ltr"
          />
        </div>
        {type === "expense" && !isWithdrawal && (
          <>
            <div>
              <label className="m3-label">אמצעי תשלום</label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {([['card', 'אשראי'], ['cash', 'מזומן'], ['bank', 'בנק']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`min-h-[44px] rounded-xl border text-sm font-semibold ${paymentMethod === value ? 'border-primary bg-primary-container text-primary' : 'border-outline-variant text-on-surface-variant'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="m3-label">קטגוריה</label>
              <select
                className="m3-input mt-1 w-full px-3 py-3 text-base"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setCategoryTouched(true);
                }}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {mode.kind === "add" && categoryGuess.confidence >= 0.8 && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  זוהתה אוטומטית: {categoryGuess.category}
                </p>
              )}
            </div>
            <label className="flex min-h-[48px] items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={isVariable}
                onChange={(e) => setIsVariable(e.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              הוצאה משתנה (מזון, קניות...)
            </label>
          </>
        )}
        {mode.kind === "edit" && onDelete && (
          <button
            type="button"
            disabled={deleting || saving}
            onClick={async () => {
              if (!window.confirm("למחוק את הרישום מהחודש?")) return;
              setDeleting(true);
              try {
                await onDelete();
                localStorage.removeItem(getDraftKey(storageScope, mode));
              } catch {
                // The parent displays the server error.
              } finally {
                setDeleting(false);
              }
            }}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-error/25 text-sm font-bold text-error sm:hidden"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? "מוחק…" : "מחיקת הרישום"}
          </button>
        )}
        {mode.kind === "edit" && onTogglePaid && (
          <button
            type="button"
            disabled={togglingPaid || saving}
            onClick={async () => {
              setTogglingPaid(true);
              try {
                await onTogglePaid();
              } finally {
                setTogglingPaid(false);
              }
            }}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-bold ${mode.entry.is_paid ? "border-primary/30 bg-primary-container text-primary" : "border-success/30 bg-success-container text-success"}`}
          >
            {togglingPaid ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {togglingPaid ? "מעדכן…" : mode.entry.is_paid ? "החזר למתוכנן (ביטול בוצע)" : "סימון כבוצע"}
          </button>
        )}
        {mode.kind === "edit" && mode.entry.entry_kind === "transaction" && !mode.entry.is_from_template && onCreateTemplate && (
          <section className="mt-2 rounded-xl border border-primary/20 bg-primary-container/35 p-3">
            <p className="text-sm font-bold text-primary">הפיכה לתבנית קבועה</p>
            <p className="mt-1 text-xs text-on-surface-variant">התנועה הנוכחית נשארת ללא שינוי; התבנית תשמש בחודשים הבאים בלבד.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select className="m3-input px-2 py-2 text-sm" value={templateFrequency} onChange={(e) => setTemplateFrequency(e.target.value as "monthly" | "bi-monthly")} aria-label="תדירות התבנית">
                <option value="monthly">כל חודש</option>
                <option value="bi-monthly">חודש כן חודש לא</option>
              </select>
              <input className="m3-input px-2 py-2 text-sm" type="number" min="1" max="31" inputMode="numeric" value={templateDay} onChange={(e) => setTemplateDay(e.target.value)} placeholder="יום בחודש" aria-label="יום בחודש" />
            </div>
            {templateMessage && <p role="status" className="mt-2 text-xs font-bold text-success">{templateMessage}</p>}
            <button type="button" disabled={creatingTemplate || saving} onClick={async () => {
              const dayOfMonth = templateDay.trim() === "" ? null : Number(templateDay);
              if (dayOfMonth !== null && (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31)) {
                setTemplateMessage("יש להזין יום בין 1 ל־31");
                return;
              }
              setCreatingTemplate(true);
              setTemplateMessage("");
              try {
                const result = await onCreateTemplate({ frequency: templateFrequency, dayOfMonth });
                setTemplateMessage(result.created ? "התבנית נוצרה לחודשים הבאים" : "התבנית כבר קיימת — לא נוצרה כפילות");
              } catch {
                setTemplateMessage("יצירת התבנית נכשלה. אפשר לנסות שוב.");
              } finally {
                setCreatingTemplate(false);
              }
            }} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-surface text-sm font-bold text-primary disabled:opacity-60">
              {creatingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <CopyPlus className="h-4 w-4" />}
              {creatingTemplate ? "יוצר תבנית…" : "יצירת תבנית מהתנועה"}
            </button>
          </section>
        )}
      </div>
    </BottomSheet>
  );
}

function getDraftKey(scope: string, mode: LedgerSheetMode) {
  const identity = mode.kind === "edit" ? `edit:${mode.entry.id}` : `add:${mode.type}`;
  return `merkanpil-ledger-draft:${scope}:${identity}`;
}
