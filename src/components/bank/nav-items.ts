import {
  Home,
  ArrowLeftRight,
  Tags,
  Upload,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  mobileLabel?: string;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "סיכום חודשי", mobileLabel: "סיכום", icon: Home },
  { href: "/transactions", label: "תנועות", mobileLabel: "תנועות", icon: ArrowLeftRight },
  { href: "/categories", label: "קטגוריות", mobileLabel: "קטגוריות", icon: Tags },
  { href: "/import", label: "ייבוא ללמידה", mobileLabel: "ייבוא", icon: Upload },
  { href: "/insights", label: "תובנות", mobileLabel: "תובנות", icon: Sparkles },
];
