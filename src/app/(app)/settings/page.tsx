"use client";
import Link from "next/link";
import {
  Settings,
  LayoutTemplate,
  SlidersHorizontal,
  Moon,
  Sun,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import { PageHeading } from "@/components/ui/Workspace";
import { useTheme } from "@/components/providers/ThemeProvider";
export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const items = [
    {
      href: "/templates",
      title: "פריטים קבועים",
      description: "ניהול שמות, סכומים ותדירות של פריטים לשימוש חוזר",
      icon: LayoutTemplate,
    },
    {
      href: "/dashboard#statistics",
      title: "סטטיסטיקות",
      description: "להסתכל על התמונה שנבנית לאורך החודשים",
      icon: BarChart3,
    },
  ];
  return (
    <div className="workspace-page">
      <PageHeading
        title="הגדרות"
        description="התאמות אישיות וכלי ניהול, במקום אחד."
      />
      <section className="workspace-list">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="workspace-settings-row hover:bg-surface-container-low"
          >
            <item.icon className="h-5 w-5 shrink-0 text-primary" />
            <span className="flex-1">
              <b className="block text-sm">{item.title}</b>
              <small className="mt-1 block text-on-surface-variant">
                {item.description}
              </small>
            </span>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ))}
      </section>
      <section className="finance-panel">
        <h2 className="mb-3 text-sm font-bold">תצוגה</h2>
        <button onClick={toggleTheme} className="workspace-button">
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          {theme === "light" ? "מעבר למצב כהה" : "מעבר למצב בהיר"}
        </button>
      </section>
      <details className="finance-panel">
        <summary className="cursor-pointer text-sm font-bold">
          כלים מתקדמים
        </summary>
        <Link href="/setup" className="workspace-settings-row">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <span>
            <b className="block text-sm">עריכת התכנון הבסיסי</b>
            <small className="text-on-surface-variant">
              אשף הגדרה וכלי איפוס
            </small>
          </span>
          <Settings className="ms-auto h-4 w-4" />
        </Link>
        <p className="workspace-muted">
          שינויים בתכנון הבסיסי מיועדים לספריית הפריטים. לעדכון חודש מסוים,
          השתמש במסך החודש שלי.
        </p>
      </details>
    </div>
  );
}
