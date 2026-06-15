"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  MessageSquare,
  Settings,
  Accessibility,
} from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { shortUserId } from "@/lib/utils/format";

type BankHeaderProps = {
  userName: string;
  userId: string;
};

export function BankHeader({ userName, userId }: BankHeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bank-header z-20 shrink-0 border-b border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between gap-4 px-4 py-2 lg:px-6">
        {/* Right (RTL start): Logo */}
        <Link href="/dashboard" className="shrink-0">
          <Image
            src="/logo.png"
            alt="מרכנטיל"
            width={140}
            height={48}
            className="h-10 w-auto object-contain lg:h-11"
            priority
          />
        </Link>

        {/* Center: User */}
        <div className="hidden flex-col items-center text-center sm:flex">
          <span className="text-sm font-bold text-primary">{userName}</span>
          <span className="text-xs text-on-surface-variant" dir="ltr">
            {shortUserId(userId)}
          </span>
        </div>

        {/* Left (RTL end): Utilities */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <HeaderIcon label="נגישות" onClick={() => {}}>
            <Accessibility className="h-5 w-5" />
          </HeaderIcon>
          <HeaderIcon label="הגדרות" href="/categories">
            <Settings className="h-5 w-5" />
          </HeaderIcon>
          <HeaderIcon label="הודעות" onClick={() => {}}>
            <MessageSquare className="h-5 w-5" />
          </HeaderIcon>
          <HeaderIcon label="התראות" onClick={() => {}}>
            <Bell className="h-5 w-5" />
          </HeaderIcon>
          <HeaderIcon label={theme === "light" ? "מצב כהה" : "מצב בהיר"} onClick={toggleTheme}>
            <span className="text-base">{theme === "light" ? "🌙" : "☀️"}</span>
          </HeaderIcon>
          <HeaderIcon label="יציאה" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </HeaderIcon>
        </div>
      </div>
    </header>
  );
}

function HeaderIcon({
  children,
  label,
  href,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary";

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label} title={label}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={className} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}
