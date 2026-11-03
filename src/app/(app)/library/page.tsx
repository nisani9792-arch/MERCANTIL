"use client";
import Link from "next/link";
import { MonthNavigator } from "@/components/ui/MonthNavigator";
import { PageHeading } from "@/components/ui/Workspace";
import { InitMonthPanel } from "@/components/ledger/InitMonthPanel";
import { useMonthStore } from "@/stores/useMonthStore";
export default function LibraryPage() {
  const month = useMonthStore((s) => s.monthKey);
  return (
    <div className="workspace-page">
      <PageHeading
        title="ספריית הפריטים"
        description="הפריטים שלך מהחודשים הקודמים. בחר רק את מה שרלוונטי לחודש הזה."
        action={
          <div className="workspace-month-picker">
            <MonthNavigator />
          </div>
        }
      />
      <div className="workspace-tabs">
        <Link href="/library" aria-current="page">
          מחודשים קודמים
        </Link>
        <Link href="/templates">פריטים קבועים</Link>
      </div>
      <InitMonthPanel
        monthKey={month}
        initialized
        initiallyOpen
        title="מה נוסיף לחודש?"
      />
      <p className="workspace-muted">
        הוספה מהספרייה יוצרת רישום בחודש הנבחר. הכנסות ממתינות לסכום עדכני,
        והוצאות מוצעות לפי הסכום האחרון. החודשים הקודמים נשארים כפי שהיו.
      </p>
    </div>
  );
}
