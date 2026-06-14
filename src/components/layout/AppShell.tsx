"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "לוח בקרה", shortcut: "dashboard" },
  { href: "/transactions", label: "תנועות", shortcut: "transactions" },
  { href: "/import", label: "ייבוא AI", shortcut: "import" },
  { href: "/insights", label: "תובנות", shortcut: "insights" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="sticky top-0 z-10 border-b border-outline-variant bg-surface-container-high/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="flex shrink-0 items-center">
              <Image
                src="/logo.png"
                alt="מרכנטיל"
                width={160}
                height={56}
                className="h-12 w-auto object-contain sm:h-14"
                priority
              />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm transition-colors",
                    pathname === item.href
                      ? "bg-primary-container text-primary font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-secondary-container px-2.5 py-1 text-xs font-semibold text-secondary sm:inline">
              AI
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container"
              aria-label="החלף מצב תצוגה"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container"
            >
              יציאה
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors",
                pathname === item.href
                  ? "bg-primary-container text-primary font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
