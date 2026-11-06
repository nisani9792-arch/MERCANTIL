import {
  Home,
  CalendarDays,
  Library,
  type LucideIcon,
} from "lucide-react";
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  mobileLabel?: string;
  description?: string;
};
export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "סקירה וסטטיסטיקות",
    mobileLabel: "סקירה",
    icon: Home,
    description: "התמונה החודשית",
  },
  {
    href: "/month",
    label: "החודש שלי",
    icon: CalendarDays,
    description: "הכנסות והוצאות",
  },
  {
    href: "/library",
    label: "ספריית פריטים",
    mobileLabel: "הספרייה",
    icon: Library,
    description: "בחירה מההיסטוריה",
  },
];
