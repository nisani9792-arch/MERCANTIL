import { Suspense } from "react";
import { PinGate } from "@/components/layout/PinGate";

export default function LoginPage() {
  return (
    <Suspense>
      <PinGate />
    </Suspense>
  );
}
