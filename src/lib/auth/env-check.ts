import { isPinConfigured } from "@/lib/auth/pin";
import { isSessionConfigured } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/client";

export function getAuthSetupError(): string | null {
  if (!isDatabaseConfigured()) {
    return "חיבור מסד הנתונים אינו מוגדר בשרת.";
  }
  if (!isSessionConfigured()) {
    return "שירות ההתחברות אינו מוגדר בשרת.";
  }
  if (!isPinConfigured()) {
    return "קוד הגישה אינו מוגדר בשרת.";
  }
  return null;
}
