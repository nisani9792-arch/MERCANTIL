import { BankHeader } from "@/components/bank/BankHeader";
import {
  BankNavSidebar,
  BankMobileNav,
  BankMobileFab,
} from "@/components/bank/BankNavSidebar";
import { InstallPrompt } from "@/components/layout/InstallPrompt";

type BankShellProps = {
  children: React.ReactNode;
  userName: string;
  userId: string;
};

export function BankShell({ children, userName, userId }: BankShellProps) {
  return (
    <div className="bank-canvas flex min-h-[100dvh] flex-col">
      <BankHeader userName={userName} userId={userId} />
      <div className="flex min-h-0 flex-1">
        <BankNavSidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 lg:px-6 lg:py-6 lg:pb-6">
          {children}
        </main>
      </div>
      <BankMobileFab />
      <BankMobileNav />
      <InstallPrompt />
    </div>
  );
}
