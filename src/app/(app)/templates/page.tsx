import { Suspense } from "react";
import { TemplateList } from "@/components/templates/TemplateList";

export default function TemplatesPage() {
  return (
    <Suspense>
      <TemplateList />
    </Suspense>
  );
}
