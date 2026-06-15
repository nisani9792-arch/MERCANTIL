import { Suspense } from "react";
import { MonthView } from "@/components/month/MonthView";

export default function MonthPage() {
  return (
    <Suspense>
      <MonthView />
    </Suspense>
  );
}
