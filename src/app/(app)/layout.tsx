import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";
import { isDatabaseConfigured } from "@/lib/db/client";
import { BankShell } from "@/components/bank/BankShell";

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

  return (
    <BankShell userName={user.full_name ?? user.email} userId={user.id}>
      {children}
    </BankShell>
  );
}
