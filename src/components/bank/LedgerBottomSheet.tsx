"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EXPENSE_CATEGORIES } from "@/lib/constants/budget";
import type { LedgerItemType, MonthlyLedgerEntry } from "@/types/ledger";

export type LedgerSheetMode =
  | { kind: "add"; type: LedgerItemType }
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
  }) => void;
  saving?: boolean;
};

export function LedgerBottomSheet({
  open,
  mode,
  onClose,
  onSave,
  saving,
}: LedgerBottomSheetProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("אחר");
  const [isVariable, setIsVariable] = useState(false);

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === "edit") {
      setName(mode.entry.name);
      setAmount(String(mode.entry.amount));
      setCategory(mode.entry.category);
      setIsVariable(mode.entry.is_variable);
    } else {
      setName("");
      setAmount("");
      setCategory(mode.type === "expense" ? "מזון" : "הכנסה");
      setIsVariable(mode.type === "expense");
    }
  }, [mode]);

  if (!mode) return null;

  const type = mode.kind === "edit" ? mode.entry.type : mode.type;
  const title =
    mode.kind === "edit"
      ? "עריכת רישום"
      : type === "income"
        ? "הוספת הכנסה"
        : "הוספת הוצאה";

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="grid gap-3">
        <div>
          <label className="m3-label">שם</label>
          <input
            className="m3-input mt-1 w-full px-3 py-3 text-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="למשל: סופר, משכורת..."
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
        {type === "expense" && (
          <>
            <div>
              <label className="m3-label">קטגוריה</label>
              <select
                className="m3-input mt-1 w-full px-3 py-3 text-base"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
        <button
          type="button"
          disabled={!name.trim() || !amount || saving}
          onClick={() =>
            onSave({
              name: name.trim(),
              amount: Number(amount),
              type,
              category: type === "income" ? "הכנסה" : category,
              isVariable: type === "expense" && isVariable,
            })
          }
          className="m3-btn-primary mt-2 min-h-[52px] w-full py-3 text-base"
        >
          {saving ? "שומר..." : "שמור"}
        </button>
      </div>
    </BottomSheet>
  );
}
