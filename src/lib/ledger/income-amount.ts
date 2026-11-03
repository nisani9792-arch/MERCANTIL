/** Blank income amounts are unknown, whereas an explicit zero is a known amount. */
export function incomeAmountState(type: string, amount: number, pending = false) {
  if (pending && (!(type === "income" || type === "expense") || amount !== 0)) {
    throw new Error("סכום חסר מחייב רישום הכנסה או הוצאה ללא סכום");
  }
  return { amount, amountPending: pending };
}

export function incomeAmountInput(item: { amount: number; amount_pending?: boolean }) {
  return item.amount_pending ? "" : String(item.amount);
}
