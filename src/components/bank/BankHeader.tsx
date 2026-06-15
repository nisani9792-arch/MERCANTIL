"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { shortUserId } from "@/lib/utils/format";
import { navItems } from "@/components/bank/nav-items";
import { cn } from "@/lib/utils/cn";

type BankHeaderProps = {
  userName: string;
  userId: string;
};

export function BankHeader({ userName, userId }: BankHeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="bank-header safe-top z-20 shrink-0 border-b border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container lg:hidden"
              aria-label="תפריט"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/dashboard" className="shrink-0">
              <Image
                src="/logo.png"
                alt="מרכנטיל"
                width={140}
                height={48}
                className="h-9 w-auto object-contain sm:h-10 lg:h-11"
                priority
              />
            </Link>
          </div>

          <div className="flex min-w-0 flex-col items-center text-center">
            <span className="truncate text-sm font-bold text-primary">{userName}</span>
            <span className="hidden text-xs text-on-surface-variant sm:block" dir="ltr">
              {shortUserId(userId)}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <HeaderIcon label={theme === "light" ? "מצב כהה" : "מצב בהיר"} onClick={toggleTheme}>
              <span className="text-base">{theme === "light" ? "🌙" : "☀️"}</span>
            </HeaderIcon>
            <HeaderIcon label="הגדרות" href="/categories" className="hidden sm:flex">
              <Settings className="h-5 w-5" />
            </HeaderIcon>
            <HeaderIcon label="יציאה" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </HeaderIcon>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="סגור תפריט"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 flex w-[min(100%,280px)] flex-col bg-surface-container-lowest shadow-elevation-2 safe-top safe-bottom">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <span className="font-bold text-on-surface">תפריט</span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container"
                aria-label="סגור"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="mb-1 flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container"
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-outline-variant p-4">
              <Link
                href="/transactions?action=add"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-[48px] items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-on-primary"
              >
                + הוספת תנועה ידנית
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function HeaderIcon({
  children,
  label,
  href,
  onClick,
  className,
}: {
  children: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const base =
    "flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(base, className)}
        aria-label={label}
        title={label}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cn(base, className)}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
