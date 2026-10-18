"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Landmark, Link2 } from "lucide-react";
import { fetchLive, mutateLive } from "@/lib/api/fetch-live";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { BankReconciliationItem } from "@/lib/db/reconciliation";

type Payload = { transactions: BankReconciliationItem[] };

export function BankReconciliationPanel({ monthKey }: { monthKey: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["reconciliation", monthKey],
    queryFn: () => fetchLive<Payload>(`/api/reconciliation?month=${monthKey}`),
    staleTime: 10_000,
  });
  const reconcile = useMutation({
    mutationFn: async ({ transactionId, ledgerEntryId }: { transactionId: string; ledgerEntryId: string }) => {
      const response = await mutateLive(`/api/reconciliation/${transactionId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ledgerEntryId }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(result.error ?? "ההתאמה לא נשמרה");
      }
    },
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reconciliation", monthKey] }),
        queryClient.invalidateQueries({ queryKey: ["ledger", monthKey] }),
        queryClient.invalidateQueries({ queryKey: ["analytics", monthKey] }),
      ]);
    },
  });

  const items = data?.transactions ?? [];
  if (isLoading || items.length === 0) return null;

  return <section className="overflow-hidden rounded-2xl border border-primary/20 bg-primary-container/25 shadow-sm">
    <header className="flex items-center gap-3 border-b border-primary/15 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary"><Landmark className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-black">התאמה מול הבנק</h2><p className="text-xs text-on-surface-variant">{items.length} תנועות שיובאו ועדיין לא אושרו בתכנון</p></div>
    </header>
    <div className="divide-y divide-primary/10">
      {items.map((item) => <article key={item.id} className="p-4">
        <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary"><Link2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.description}</p><p className="text-xs text-on-surface-variant">{formatDate(item.date)} · {item.category}</p></div><strong className={item.type === "income" ? "text-success" : "text-error"} dir="ltr">{formatCurrency(item.amount)}</strong></div>
        {item.candidates.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{item.candidates.map((candidate) => <button key={candidate.id} type="button" disabled={reconcile.isPending} onClick={() => reconcile.mutate({ transactionId: item.id, ledgerEntryId: candidate.id })} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-primary/25 bg-surface px-3 text-xs font-bold text-primary transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50"><CheckCircle2 className="h-3.5 w-3.5" />סמן “{candidate.name}” בוצע · {formatCurrency(candidate.amount)}</button>)}</div> : <p className="mt-3 rounded-xl bg-surface/70 px-3 py-2 text-xs text-on-surface-variant">לא נמצאה תנועה מתוכננת מתאימה בחודש זה.</p>}
      </article>)}
    </div>
    {reconcile.isError && <p role="alert" className="border-t border-error/20 bg-error-container/50 px-4 py-3 text-xs font-bold text-error">{reconcile.error.message}</p>}
  </section>;
}
