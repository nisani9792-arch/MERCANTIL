/** Blank income amounts are unknown, whereas an explicit zero is a known amount. */
export function incomeAmountState(type: string, amount: number, pending = false) {
  if (pending && (type !== "income" || amount !== 0)) {
    throw new Error("סכום חסר מותר רק להכנסה ללא סכום");
  }
  return { amount, amountPending: pending };
}

export function incomeAmountInput(item: { amount: number; amount_pending?: boolean }) {
  return item.amount_pending ? "" : String(item.amount);
}
