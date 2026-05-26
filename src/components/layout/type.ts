import type Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface Route {
  href: Parameters<typeof Link>[0]["href"];
  icon: LucideIcon;
  label: string;
}
