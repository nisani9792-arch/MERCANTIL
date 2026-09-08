import {
  Home,
  CalendarDays,
  LayoutTemplate,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  mobileLabel?: string;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "סקירה פיננסית", mobileLabel: "סקירה", icon: Home },
  { href: "/month", label: "תנועות החודש", mobileLabel: "תנועות", icon: CalendarDays },
  { href: "/templates", label: "תכנון קבוע", mobileLabel: "תכנון", icon: LayoutTemplate },
  { href: "/setup", label: "אשף הגדרה", mobileLabel: "הגדרה", icon: SlidersHorizontal },
];
