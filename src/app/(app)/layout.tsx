import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {getWorkspaceProfile} from "@/lib/db/workspace-profile";
import { isDatabaseConfigured } from "@/lib/db/client";
import {currentMonthKey} from "@/lib/utils/month";
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

  const profile=await getWorkspaceProfile(session.userId);
  if(!profile)redirect("/login");
  const setupRequired=!profile.configured;

  return (
    <BankShell
      userId={session.userId}
      userName={profile.fullName ?? profile.email}
      initialMonthKey={profile.monthKey ?? currentMonthKey()}
      setupRequired={setupRequired}
    >
      {children}
    </BankShell>
  );
}
