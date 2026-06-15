import { Suspense } from "react";
import { LedgerEditor } from "@/components/ledger/LedgerEditor";

export default function MonthPage() {
  return (
    <Suspense>
      <LedgerEditor />
    </Suspense>
  );
}
