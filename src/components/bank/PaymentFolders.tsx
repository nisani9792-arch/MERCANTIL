"use client";
import { CreditCard, HandCoins } from "lucide-react";
import { useState, type DragEvent } from "react";
import { TransactionCard } from "./TransactionCard";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";

type Props = {
  entries: MonthlyLedgerEntry[];
  allEntries: MonthlyLedgerEntry[];
  showExpenses: boolean;
  busy: boolean;
  onMove: (entry: MonthlyLedgerEntry, card: boolean) => void;
  onTap: (entry: MonthlyLedgerEntry) => void;
  onDelete: (entry: MonthlyLedgerEntry) => void;
  onTogglePaid: (entry: MonthlyLedgerEntry) => void;
};
export function PaymentFolders({ entries, allEntries, showExpenses, busy, onMove, onTap, onDelete, onTogglePaid }: Props) {
  const [cardOpen, setCardOpen] = useState(false);
  function move(entry: MonthlyLedgerEntry, targetCard: boolean) {
    if (targetCard) setCardOpen(true);
    onMove(entry, targetCard);
  }
  const [over, setOver] = useState<string | null>(null);
  const expenses = entries.filter((e) => e.type === "expense");
  const card = expenses.filter((e) => e.payment_method === "card");
  const manual = expenses.filter((e) => e.payment_method !== "card");
  const income = entries.filter((e) => e.type === "income");
  function drop(event: DragEvent, targetCard: boolean) {
    event.preventDefault(); setOver(null);
    if (busy) return;
    const id = event.dataTransfer.getData("application/x-mercantil-entry");
    const entry = allEntries.find((e) => e.id === id && e.type === "expense" && e.entry_kind === "transaction");
    if (entry && (entry.payment_method === "card") !== targetCard) move(entry, targetCard);
  }
  const rows = (items: MonthlyLedgerEntry[]) => <div className="workspace-list">{items.map((entry) => <TransactionCard
    key={entry.id} entry={entry} busy={busy}
    onTap={() => onTap(entry)} onDelete={() => onDelete(entry)} onTogglePaid={() => onTogglePaid(entry)}
    onMovePayment={entry.type === "expense" ? (value) => move(entry, value) : undefined}
  />)}</div>;
  return <div className="payment-folders">
    {income.length > 0 && <section aria-label="הכנסות">{showExpenses && <h3 className="payment-group-label">הכנסות</h3>}{rows(income)}</section>}
    {showExpenses && <>
      <details open={cardOpen} onToggle={(event) => setCardOpen(event.currentTarget.open)} className="credit-folder" data-drag-over={over === "card"}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setOver("card"); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null); }}
        onDrop={(e) => drop(e, true)}>
        <summary>
          <CreditCard aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1"><b>כרטיס האשראי <span className="payment-count">{card.length}</span></b><small>חיוב אוטומטי ב־10 · גררו הוצאות לכאן</small></span>
          <span className="credit-folder-total"><strong dir="ltr">{formatCurrency(card.reduce((sum, e) => sum + Math.round(e.amount * 100), 0) / 100)}</strong>
            {card.some((e) => e.amount_pending) && <small>יש סכומים להשלמה</small>}
          </span><span aria-hidden="true" className="credit-folder-chevron">⌄</span>
        </summary>
        <p className="payment-folder-hint">גרור לכאן הוצאות, או בחר ״לכרטיס האשראי״ בתפריט ⋯ של ההוצאה. השיוך מסדר את התכנון; אישור הביצוע נשאר לבדיקתך.</p>
        {card.length > 0 ? rows(card) : <p className="payment-empty">אין הוצאות בכרטיס בתצוגה הזו</p>}
      </details>
      <section className="manual-payment-group" aria-label="לתשלום ידני" data-drag-over={over === "manual"}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setOver("manual"); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null); }}
        onDrop={(e) => drop(e, false)}>
        <div className="payment-group-label"><HandCoins aria-hidden="true" className="h-4 w-4" /><h3>לתשלום ידני</h3>
          <span className="payment-count">{manual.length}</span><strong className="ms-auto" dir="ltr">{formatCurrency(manual.reduce((sum, e) => sum + Math.round(e.amount * 100), 0) / 100)}</strong></div>
        {manual.length > 0 ? rows(manual) : <p className="payment-empty">אין פריטים לתשלום ידני בתצוגה הזו</p>}
      </section>
    </>}
  </div>;
}
