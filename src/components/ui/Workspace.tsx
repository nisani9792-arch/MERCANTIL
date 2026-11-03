import type { ReactNode } from "react";
import { ArrowLeft, Inbox } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";

export function PageHeading({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="workspace-heading">
      <div>
        {eyebrow && <p className="workspace-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="workspace-heading-action">{action}</div>}
    </header>
  );
}
export function StatCard({
  label,
  value,
  note,
  featured = false,
  tone,
}: {
  label: string;
  value: number | null;
  note?: string;
  featured?: boolean;
  tone?: "income" | "expense";
}) {
  return (
    <div data-flow={tone} className={"stat-card" + (featured ? " stat-card-featured" : "")}>
      <span>{label}</span>
      <strong dir="ltr">{value === null ? "—" : formatCurrency(value)}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="workspace-empty">
      <Inbox aria-hidden="true" className="h-8 w-8 text-primary" />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function SectionHeading({
  title,
  description,
  href,
  linkText = "לכל הפרטים",
}: {
  title: string;
  description?: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && (
        <Link href={href}>
          {linkText}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
