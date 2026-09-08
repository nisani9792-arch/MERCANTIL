"use client";
/* eslint-disable react-hooks/set-state-in-effect -- reset form state when a different ledger item opens */

import { Sparkles } from "lucide-react";
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
  onClose: () => void;
  onSave: (data: {
    name: string;
    amount: number;
    type: LedgerItemType;
    category: string;
    isVariable: boolean;
    entryKind: LedgerEntryKind;
    paymentMethod: PaymentMethod;
  }) => void;
  saving?: boolean;
  error?: string;
};

export function LedgerBottomSheet({
  open,
  mode,
  onClose,
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

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === "edit") {
      setName(mode.entry.name);
      setAmount(String(mode.entry.amount));
      setCategory(mode.entry.category);
      setIsVariable(mode.entry.is_variable);
      setPaymentMethod(mode.entry.payment_method);
      setCategoryTouched(true);
    } else {
      setName(mode.draft?.name ?? "");
      setAmount(mode.draft?.amount ? String(mode.draft.amount) : "");
      setCategory(mode.draft?.category ?? (mode.type === "expense" ? "מזון" : "הכנסה"));
      setIsVariable(mode.draft?.isVariable ?? mode.type === "expense");
      setPaymentMethod(mode.draft?.paymentMethod ?? (mode.type === "expense" ? "card" : "bank"));
      setCategoryTouched(Boolean(mode.draft?.category));
    }
  }, [mode]);

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
  const valid = Boolean(name.trim()) && Number.isFinite(Number(amount)) && Number(amount) > 0;
  const dirty = mode.kind === "edit"
    ? name !== mode.entry.name || amount !== String(mode.entry.amount) || category !== mode.entry.category || isVariable !== mode.entry.is_variable || paymentMethod !== mode.entry.payment_method
    : Boolean(name.trim() || amount);

  const saveButton = (
    <button
      type="button"
      disabled={!valid || saving}
      onClick={() => onSave({
        name: name.trim(),
        amount: Number(amount),
        type,
        category: type === "income" ? "הכנסה" : category,
        isVariable: type === "expense" && isVariable,
        entryKind: isWithdrawal ? "cash_withdrawal" : "transaction",
        paymentMethod: isWithdrawal ? "bank" : paymentMethod,
      })}
      className="m3-btn-primary min-h-[54px] w-full py-3 text-base shadow-elevation-1"
    >
      {saving ? "שומר שינויים…" : mode.kind === "edit" ? "שמירת השינויים" : "שמירת התנועה"}
    </button>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={title} dirty={dirty && !saving} footer={saveButton}>
      {mode.kind === "edit" && <p className="mb-4 rounded-xl bg-primary-container p-3 text-sm text-primary">השינוי בשם ובסכום נשמר לחודש הזה בלבד. התבנית הקבועה לא תשתנה.</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-error-container p-3 text-sm font-semibold text-error">{error}</p>}
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
      </div>
    </BottomSheet>
  );
}
