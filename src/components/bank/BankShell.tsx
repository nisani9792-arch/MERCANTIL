import { BankHeader } from "@/components/bank/BankHeader";
import { BankNavSidebar, BankMobileNav } from "@/components/bank/BankNavSidebar";
import { QuickActionsPanel } from "@/components/bank/QuickActionsPanel";

type BankShellProps = {
  children: React.ReactNode;
  userName: string;
  userId: string;
};

export function BankShell({ children, userName, userId }: BankShellProps) {
  return (
    <div className="bank-canvas flex min-h-screen flex-col">
      <BankHeader userName={userName} userId={userId} />
      <div className="flex min-h-0 flex-1">
        <BankNavSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 pb-20 lg:px-6 lg:py-6 lg:pb-6">
          {children}
        </main>
        <QuickActionsPanel />
      </div>
      <BankMobileNav />
    </div>
  );
}
