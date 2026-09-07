"use client";

import { BankHeader } from "@/components/bank/BankHeader";
import {
  BankNavSidebar,
  BankMobileNav,
  BankMobileFab,
} from "@/components/bank/BankNavSidebar";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { useRefetchOnVisible } from "@/hooks/useRefetchOnVisible";

type BankShellProps = {
  children: React.ReactNode;
  userName: string;
};

export function BankShell({ children, userName }: BankShellProps) {
  useRefetchOnVisible();

  return (
    <div className="bank-canvas flex min-h-[100dvh] flex-col">
      <BankHeader userName={userName} />
      <div className="flex min-h-0 flex-1">
        <BankNavSidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-5 lg:px-8 lg:py-7 lg:pb-7">
          {children}
        </main>
      </div>
      <BankMobileFab />
      <BankMobileNav />
      <InstallPrompt />
    </div>
  );
}
