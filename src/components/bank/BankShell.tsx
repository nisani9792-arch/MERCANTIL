"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
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
  setupRequired: boolean;
};

export function BankShell({ children, userName, setupRequired }: BankShellProps) {
  useRefetchOnVisible();
  const pathname = usePathname();
  const router = useRouter();
  const redirectingToSetup = setupRequired && pathname !== "/setup";

  useEffect(() => {
    if (redirectingToSetup) router.replace("/setup");
  }, [redirectingToSetup, router]);

  return (
    <div className="bank-canvas flex min-h-[100dvh] flex-col">
      <BankHeader userName={userName} />
      <div className="flex min-h-0 flex-1">
        <BankNavSidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-5 lg:px-8 lg:py-7 lg:pb-7">
          {redirectingToSetup ? (
            <div className="mx-auto mt-20 max-w-sm rounded-3xl bg-surface-container-lowest p-6 text-center shadow-elevation-1">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-primary-container border-t-primary" />
              <p className="mt-4 text-sm font-bold text-on-surface">פותח את אשף ההגדרה…</p>
            </div>
          ) : children}
        </main>
      </div>
      <BankMobileFab />
      <BankMobileNav />
      <InstallPrompt />
    </div>
  );
}
