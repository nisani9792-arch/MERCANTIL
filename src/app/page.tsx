import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/client";

// The destination depends on the request cookie and production secrets.
// Keep this route server-rendered for Cloudflare Workers rather than allowing
// Next to attempt static prerendering during the build.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isDatabaseConfigured()) {
    redirect("/login?setup=database");
  }

  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}
