"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Settings } from "lucide-react";
import { navItems } from "@/components/bank/nav-items";
export function BankNavSidebar() {
  const pathname = usePathname();
  return (
    <aside className="bank-sidebar sticky top-[65px] hidden h-[calc(100dvh-65px)] w-52 shrink-0 flex-col justify-between p-5 lg:flex">
      <div>
        <p className="mb-4 px-3 text-[10px] font-bold tracking-wider text-on-surface-variant">
          התכנון האישי שלך
        </p>
        <nav className="space-y-2" aria-label="ניווט ראשי">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                pathname === item.href ||
                (item.href === "/library" && pathname === "/templates")
                  ? "page"
                  : undefined
              }
              className={
                "flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 " +
                (pathname === item.href ||
                (item.href === "/library" && pathname === "/templates")
                  ? "bg-primary-container text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low")
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>
                <b className="block text-sm font-semibold">{item.label}</b>

              </span>
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-outline-variant pt-4">
          <Link
            href="/trends"
            aria-current={pathname === "/trends" ? "page" : undefined}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-on-surface-variant"
          >
            <BarChart3 className="h-4 w-4" />
            מגמות לאורך זמן
          </Link>
          <Link
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-on-surface-variant"
          >
            <Settings className="h-4 w-4" />
            הגדרות
          </Link>
        </div>
      </div>

    </aside>
  );
}
export function BankMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="ניווט ראשי"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest safe-bottom lg:hidden"
    >
      <div className="mx-auto flex max-w-xl justify-around px-2 py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={
              pathname === item.href ||
              (item.href === "/library" && pathname === "/templates")
                ? "page"
                : undefined
            }
            className={
              "flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-3 text-[11px] " +
              (pathname === item.href ||
              (item.href === "/library" && pathname === "/templates")
                ? "bg-primary-container font-bold text-primary"
                : "text-on-surface-variant")
            }
          >
            <item.icon className="h-5 w-5" />
            {item.mobileLabel ?? item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
export function BankMobileFab() {
  return null;
}
