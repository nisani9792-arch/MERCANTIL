"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ArrowLeftRight,
  Tags,
  Upload,
  Sparkles,
  Search,
  Wallet,
  PiggyBank,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "דף הבית", icon: Home },
  { href: "/transactions", label: "תנועות", icon: ArrowLeftRight },
  { href: "/categories", label: "קטגוריות", icon: Tags },
  { href: "/import", label: "ייבוא AI", icon: Upload },
  { href: "/insights", label: "תובנות AI", icon: Sparkles },
];

const secondaryItems = [
  { href: "/dashboard", label: "חשבון עו״ש", icon: Wallet },
  { href: "/insights", label: "תזרים מזומנים", icon: BarChart3 },
  { href: "/categories", label: "פיקדונות", icon: PiggyBank },
];

export function BankNavSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bank-sidebar hidden w-56 shrink-0 border-s border-outline-variant bg-surface-container-lowest lg:block">
      <div className="p-3">
        <button
          type="button"
          className="mb-3 flex w-full items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant transition-colors hover:border-primary/30"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>חיפוש</span>
        </button>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-primary text-on-primary font-semibold shadow-elevation-1"
                    : "text-on-surface-variant hover:bg-surface-container",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="my-4 border-t border-outline-variant pt-3">
          <p className="mb-2 px-3 text-xs font-semibold text-on-surface-variant">מוצרים</p>
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container"
              >
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export function BankMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-outline-variant bg-surface-container-lowest lg:hidden">
      {navItems.slice(0, 5).map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
              active ? "text-primary font-semibold" : "text-on-surface-variant",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label.split(" ")[0]}
          </Link>
        );
      })}
    </nav>
  );
}
