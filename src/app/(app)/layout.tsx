import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";
import { isDatabaseConfigured } from "@/lib/db/client";
import { hasFinancialSetup } from "@/lib/db/setup";
import { BankShell } from "@/components/bank/BankShell";

// Every screen below this layout depends on the request session.  Do not let
// Next.js pre-render it at build time on the Worker.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDatabaseConfigured()) {
    redirect("/login?setup=database");
  }

  const session = await getSession();
  if (!session) redirect("/login");

  const user = await findUserById(session.userId);
  if (!user) redirect("/login");
  const setupRequired = !(await hasFinancialSetup(session.userId));

  return (
    <BankShell
      userName={user.full_name ?? user.email}
      setupRequired={setupRequired}
    >
      {children}
    </BankShell>
  );
}
