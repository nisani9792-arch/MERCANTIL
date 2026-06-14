import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";
import { isDatabaseConfigured } from "@/lib/db/client";

export default async function DashboardPage() {
  if (!isDatabaseConfigured()) {
    redirect("/login?setup=database");
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await findUserById(session.userId);
  if (!user) {
    redirect("/login");
  }

  const displayName = user.full_name ?? user.email;

  return (
    <div className="space-y-6">
      <div className="m3-card-gold relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-secondary/10 blur-2xl" />
        <h1 className="text-2xl font-bold text-on-surface">לוח בקרה</h1>
        <p className="mt-1 text-on-surface-variant">
          שלום, {displayName} — ברוך הבא למרכנטיל
        </p>
        <p className="mt-2 text-sm text-secondary font-medium">
          מערכת בנקאית חכמה עם ניתוח AI
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="m3-card p-5">
          <p className="m3-label">יתרה כוללת</p>
          <p className="mt-2 text-2xl font-bold text-primary">₪0.00</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            יתעדכן בשלב 3 — גרפים וניתוח
          </p>
        </div>
        <div className="m3-card p-5">
          <p className="m3-label">הכנסות החודש</p>
          <p className="mt-2 text-2xl font-bold text-success">₪0.00</p>
        </div>
        <div className="m3-card p-5">
          <p className="m3-label">הוצאות החודש</p>
          <p className="mt-2 text-2xl font-bold text-error">₪0.00</p>
        </div>
      </div>

      <div className="m3-card p-5">
        <h2 className="text-lg font-semibold text-on-surface">מצב המערכת</h2>
        <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
          <li>✓ Neon PostgreSQL — מסד נתונים</li>
          <li>✓ Gemini AI — תשתית מוכנה</li>
          <li>○ שלב 2: מערכת עיצוב M3 + רכיבי UI</li>
          <li>○ שלב 3: גרפים וסינון תאריכים</li>
          <li>○ שלב 4: ייבוא AI מקבצי בנק</li>
        </ul>
        <p className="mt-4 text-sm text-on-surface-variant">
          מטבע ברירת מחדל: {user.default_currency}
        </p>
      </div>
    </div>
  );
}
