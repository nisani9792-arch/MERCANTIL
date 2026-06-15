"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { navItems } from "@/components/bank/nav-items";

export function BankNavSidebar() {
  const pathname = usePathname();

  return (
    <aside className="bank-sidebar hidden w-56 shrink-0 border-s border-outline-variant bg-surface-container-lowest lg:block">
      <div className="p-3">
        <Link
          href="/month"
          className="mb-3 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>ניהול החודש</span>
        </Link>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-primary font-semibold text-on-primary shadow-elevation-1"
                    : "text-on-surface-variant hover:bg-surface-container",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="my-4 border-t border-outline-variant px-3 pt-3">
          <p className="text-xs leading-relaxed text-on-surface-variant">
            תבניות קבועות → אתחול חודש → עריכה והוצאות משתנות. פשוט וברור.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function BankMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest/95 backdrop-blur-md safe-bottom lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] transition-colors active:scale-95",
                active
                  ? "font-semibold text-primary"
                  : "text-on-surface-variant",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              <span className="leading-tight">{item.mobileLabel ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BankMobileFab() {
  return (
    <Link
      href="/month"
      className="m3-fab fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] start-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-elevation-2 transition-transform active:scale-95 lg:hidden"
      aria-label="ניהול חודש"
    >
      <Plus className="h-7 w-7" />
    </Link>
  );
}
