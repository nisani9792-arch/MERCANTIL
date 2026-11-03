"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BankHeader } from "@/components/bank/BankHeader";
import {
  BankNavSidebar,
  BankMobileNav,
  BankMobileFab,
} from "@/components/bank/BankNavSidebar";

import { useRefetchOnVisible } from "@/hooks/useRefetchOnVisible";
import { MonthSync } from "@/components/providers/MonthSync";

type BankShellProps = {
  children: React.ReactNode;
  userName: string;
  setupRequired: boolean;
};

export function BankShell({
  children,
  userName,
  setupRequired,
}: BankShellProps) {
  useRefetchOnVisible();
  const pathname = usePathname();
  const router = useRouter();
  const redirectingToSetup = setupRequired && pathname !== "/setup";

  useEffect(() => {
    if (redirectingToSetup) router.replace("/setup");
  }, [redirectingToSetup, router]);

  return (
    <div className="bank-canvas flex min-h-[100dvh] flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:p-3">
        דילוג לתוכן
      </a>
      <MonthSync />
      <BankHeader userName={userName} />
      <div className="flex min-h-0 flex-1">
        <BankNavSidebar />
        <main id="main-content" className="workspace-main min-w-0 flex-1">
          {redirectingToSetup ? (
            <div className="mx-auto mt-20 max-w-sm rounded-3xl bg-surface-container-lowest p-6 text-center shadow-elevation-1">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-primary-container border-t-primary" />
              <p className="mt-4 text-sm font-bold text-on-surface">
                פותח את אשף ההגדרה…
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <BankMobileFab />
      <BankMobileNav />
    </div>
  );
}
