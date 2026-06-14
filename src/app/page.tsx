import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/client";

export default async function HomePage() {
  if (!isDatabaseConfigured()) {
    redirect("/login?setup=database");
  }

  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}
