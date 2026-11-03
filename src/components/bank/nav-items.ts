import {
  Home,
  CalendarDays,
  Library,
  Landmark,
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
    label: "מבט על",
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
  {
    href: "/finance",
    label: "נכסים וחובות",
    icon: Landmark,
    description: "המידע הפיננסי",
  },
];
