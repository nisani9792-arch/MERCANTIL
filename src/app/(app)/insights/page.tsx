import { AiInsightPanel } from "@/components/bank/AiInsightPanel";

export default function InsightsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-on-surface">תובנות AI</h1>
        <p className="text-sm text-on-surface-variant">
          זיהוי הוצאות חוזרות, כפילויות ורעיונות חיסכון
        </p>
      </div>
      <AiInsightPanel />
    </div>
  );
}
