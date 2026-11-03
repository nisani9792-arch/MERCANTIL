"use client";
import Link from "next/link";
import { Settings, Moon, Sun, Leaf } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
export function BankHeader({ userName }: { userName: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="bank-header safe-top z-30 border-b border-outline-variant">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-7">
        <Link
          href="/dashboard"
          aria-label="מרכנפיל — מבט על"
          className="flex items-center gap-2.5"
        >
          <span className="rounded-xl bg-primary p-2 text-on-primary">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">
            מרכנפיל
            <span className="ms-3 hidden text-xs font-normal text-on-surface-variant sm:inline">
              עושים סדר בכסף
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="me-2 hidden max-w-40 truncate text-xs text-on-surface-variant sm:block">
            {userName}
          </span>
          <button
            onClick={toggleTheme}
            aria-label={theme === "light" ? "מצב כהה" : "מצב בהיר"}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
          <Link
            href="/settings"
            aria-label="הגדרות"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
