import { Suspense } from "react";
import { MonthWorkspace } from "@/components/bank/MonthWorkspace";

export default function MonthPage() {
  return (
    <Suspense>
      <MonthWorkspace />
    </Suspense>
  );
}
