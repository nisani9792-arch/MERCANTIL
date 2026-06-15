import {
  Home,
  CalendarDays,
  LayoutTemplate,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  mobileLabel?: string;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "סיכום", mobileLabel: "סיכום", icon: Home },
  { href: "/month", label: "ניהול חודש", mobileLabel: "חודש", icon: CalendarDays },
  { href: "/templates", label: "תבניות", mobileLabel: "תבניות", icon: LayoutTemplate },
];
