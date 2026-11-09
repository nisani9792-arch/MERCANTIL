"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Settings,
  LayoutTemplate,
  SlidersHorizontal,
  Moon,
  Sun,
  ArrowLeft,
  History,
} from "lucide-react";
import { PageHeading } from "@/components/ui/Workspace";
import { useTheme } from "@/components/providers/ThemeProvider";
export default function SettingsPage() {
  const qc = useQueryClient();
  const [signingOut,setSigningOut] = useState(false);
  const [logoutError,setLogoutError] = useState("");
  async function logout() {
    if (signingOut) return;
    setSigningOut(true);setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout",{method:"POST"});
      if (!response.ok) throw new Error("היציאה לא אושרה");
      qc.clear();
      // A full navigation also drops in-memory financial drafts and user context.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch {setLogoutError("לא הצלחנו לצאת. אפשר לנסות שוב.");setSigningOut(false);}
  }
  const { theme, toggleTheme } = useTheme();
  const items = [
    {
      href: "/templates",
      title: "פריטים קבועים",
      description: "ניהול שמות, סכומים ותדירות של פריטים לשימוש חוזר",
      icon: LayoutTemplate,
    },
    {
      href: "/library",
      title: "פריטים מחודשים קודמים",
      description: "היסטוריית הפריטים שלך לבחירה חוזרת",
      icon: History,
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
      <section className="finance-panel">
        <button type="button" onClick={()=>void logout()} disabled={signingOut} className="workspace-button">{signingOut ? "יוצא…" : "יציאה מהחשבון"}</button>
        {logoutError && <p role="alert" className="text-error text-sm mt-2">{logoutError}</p>}
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
