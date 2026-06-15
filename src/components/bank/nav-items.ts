import {
  Home,
  ArrowLeftRight,
  Tags,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  mobileLabel?: string;
};

/** Lean nav — fixed monthly budget, not bank clone */
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "סיכום חודשי", mobileLabel: "סיכום", icon: Home },
  { href: "/transactions", label: "הוספה", mobileLabel: "הוספה", icon: ArrowLeftRight },
  { href: "/categories", label: "קטגוריות", mobileLabel: "קטגוריות", icon: Tags },
];
