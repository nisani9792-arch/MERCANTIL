import { isPinConfigured } from "@/lib/auth/pin";
import { isSessionConfigured } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db/client";

export function getAuthSetupError(): string | null {
  if (!isDatabaseConfigured()) {
    return "DATABASE_URL לא מוגדר בשרת. הוסף ב-Render → Environment.";
  }
  if (!isSessionConfigured()) {
    return "SESSION_SECRET לא מוגדר בשרת (מינימום 16 תווים).";
  }
  if (!isPinConfigured()) {
    return "APP_PIN לא מוגדר (4–6 ספרות). הוסף ב-Render → Environment.";
  }
  return null;
}
