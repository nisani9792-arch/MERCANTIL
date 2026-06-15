"use client";

import Link from "next/link";
import { Plus, ArrowLeftRight, Sparkles, Tags, Upload } from "lucide-react";

const quickActions = [
  { href: "/transactions?action=add", label: "הוספת תנועה", icon: Plus },
  { href: "/import", label: "ייבוא AI מבנק", icon: Upload },
  { href: "/transactions?action=classify", label: "סיווג AI", icon: Sparkles },
  { href: "/categories", label: "קטגוריה חדשה", icon: Tags },
  { href: "/transactions", label: "העברה", icon: ArrowLeftRight },
];

export function QuickActionsPanel() {
  return (
    <aside className="hidden w-52 shrink-0 border-e border-outline-variant bg-surface-container-lowest xl:block">
      <div className="p-4">
        <div className="mb-4 flex flex-col items-center">
          <Link
            href="/transactions?action=add"
            className="m3-fab flex h-14 w-14 items-center justify-center rounded-full shadow-elevation-2 transition-transform hover:scale-105 active:scale-95"
            aria-label="פעולות"
          >
            <Plus className="h-7 w-7" />
          </Link>
          <span className="mt-2 text-sm font-semibold text-primary">פעולות</span>
        </div>

        <div className="m3-card overflow-hidden p-0">
          <p className="border-b border-outline-variant bg-surface-container px-3 py-2 text-xs font-bold text-on-surface">
            פעולות נפוצות
          </p>
          <ul className="divide-y divide-outline-variant">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.label}>
                  <Link
                    href={action.href}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-primary-container hover:text-primary"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {action.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="m3-card mt-4 p-3">
          <p className="text-xs font-bold text-secondary">✦ AI חכם</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            סיווג אוטומטי, זיהוי מנויים והוצאות כפולות — בעברית ובאנגלית.
          </p>
        </div>
      </div>
    </aside>
  );
}
