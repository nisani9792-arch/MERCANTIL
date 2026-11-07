"use client";
import { Check, CreditCard, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyLedgerEntry } from "@/types/ledger";
import { paymentStatus, statusLabel } from "@/lib/ledger/payment-status";
type Props = {
  entry: MonthlyLedgerEntry;
  onTap: () => void;
  onDelete: () => void;
  onTogglePaid?: () => void;
  busy?: boolean;
  onMovePayment?: (card: boolean) => void;
};
export function TransactionCard({
  entry,
  onTap,
  onDelete,
  onTogglePaid,
  busy = false,
  onMovePayment,
}: Props) {
  const status = paymentStatus(entry),
    done = status === "completed";
  return (
    <article draggable={Boolean(onMovePayment) && !busy}
      onDragStart={(event) => { event.dataTransfer.setData("application/x-mercantil-entry", entry.id); event.dataTransfer.effectAllowed = "move"; }}
      data-flow={entry.entry_kind === "cash_withdrawal" ? "transfer" : entry.type}
      data-pending={!!entry.amount_pending}
      className="m3-tx-card ledger-row relative flex min-h-20 items-center gap-3 bg-surface-container-lowest px-4 py-3">
      <span
        className="ledger-direction flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-bold"
        aria-hidden="true"
      >
        {entry.entry_kind === "cash_withdrawal" ? "⇄" : entry.type === "income" ? "↗" : "↙"}
      </span>
      <button
        onClick={onTap}
        aria-label={"עריכת " + entry.name}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-start"
      >
        <span className="min-w-0">
          <b title={entry.name} className="block break-words text-sm font-semibold">{entry.name}</b>
          <small className="mt-1 flex items-center gap-2 text-[11px] text-on-surface-variant">
            <span className="ledger-kind">{entry.entry_kind === "cash_withdrawal" ? "העברה" : entry.type === "income" ? "הכנסה" : "הוצאה"}</span>
            <span className="truncate">
            {entry.entry_kind === "cash_withdrawal"
              ? "העברה למזומן"
              : (entry.category !== entry.name ? entry.category + " · " : "") +
                (entry.is_variable ? "משתנה" : "קבועה")}
            {entry.amount_pending
              ? " · סכום להשלמה"
              : entry.due_date
                ? " · " +
                  new Intl.DateTimeFormat("he-IL", {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(entry.due_date + "T00:00:00"))
                : ""}
            </span>
          </small>
        </span>
        <strong
          className="ledger-amount shrink-0 text-sm font-bold"
          dir="ltr"
        >
          {entry.amount_pending ? <span className="ledger-missing" dir="rtl">להשלמה</span> : formatCurrency(entry.amount)}
        </strong>
      </button>
      {onTogglePaid && (
        <button
          disabled={!!entry.amount_pending || busy}
          onClick={onTogglePaid}
          aria-label={
            done
              ? "ביטול אישור ביצוע עבור " + entry.name
              : "אישור ביצוע עבור " + entry.name
          }
          title={entry.amount_pending ? "יש להשלים סכום" : statusLabel(status)}
          className={
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border disabled:opacity-30 " +
            (done
              ? "border-success/20 bg-success-container text-success"
              : "border-outline-variant text-on-surface-variant")
          }
        >
          <Check className="h-4 w-4" />
        </button>
      )}
      <details className="relative shrink-0" onKeyDown={(event)=>{if(event.key==="Escape"){event.currentTarget.open=false;event.currentTarget.querySelector("summary")?.focus();}}}>
        <summary
          aria-label={"פעולות עבור " + entry.name}
          className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
        >
          <MoreHorizontal className="h-4 w-4" />
        </summary>
        <div className="absolute end-0 top-10 z-20 w-40 rounded-xl border border-outline-variant bg-surface-container-lowest p-1 shadow-elevation-2">
          {onMovePayment && <button disabled={busy}
            onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); onMovePayment(entry.payment_method !== "card"); }}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface-container">
            <CreditCard className="h-4 w-4" />{entry.payment_method === "card" ? "לתשלום ידני" : "לכרטיס האשראי"}
          </button>}
          <button
            onClick={onTap}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface-container"
          >
            <Pencil className="h-4 w-4" />
            עריכת פרטים
          </button>
          <button
            onClick={() => {
              if (window.confirm("למחוק את הרישום?")) onDelete();
            }}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-error hover:bg-error-container"
          >
            <Trash2 className="h-4 w-4" />
            מחיקה
          </button>
        </div>
      </details>
    </article>
  );
}
