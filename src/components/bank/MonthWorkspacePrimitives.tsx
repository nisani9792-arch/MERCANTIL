import type { ReactNode } from "react";

export function QuickButton({ label, icon, tone, onClick }: { label: string; icon: ReactNode; tone: "expense" | "income" | "cash"; onClick: () => void }) {
  const styles = tone === "expense"
    ? "border-error/30 bg-error-container text-error hover:border-error/50"
    : tone === "income"
      ? "border-success/30 bg-success-container text-success hover:border-success/50"
      : "border-primary/30 bg-primary-container text-primary hover:border-primary/50";
  return <button type="button" onClick={onClick} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl border px-1 text-xs font-bold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 motion-reduce:transition-none ${styles}`}>{icon}{label}</button>;
}

export function CardSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return <section className="space-y-2"><h2 className="flex items-center gap-1.5 px-1 text-sm font-bold text-on-surface-variant">{icon}{title}</h2><div className="space-y-2">{children}</div></section>;
}
