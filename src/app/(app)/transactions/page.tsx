import { Suspense } from "react";
import { TransactionsWorkspace } from "@/components/bank/TransactionsWorkspace";

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsWorkspace />
    </Suspense>
  );
}
