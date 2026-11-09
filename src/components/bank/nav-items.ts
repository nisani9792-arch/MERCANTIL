import {
  Home,
  CalendarDays,
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
  {href:"/month",label:"החודש שלי",icon:CalendarDays},
  {href:"/dashboard",label:"סיכום ותרשימים",mobileLabel:"סיכום",icon:Home},
];
