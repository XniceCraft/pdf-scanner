"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarkedIcon,
  FileTextIcon,
  HomeIcon,
  // Settings,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { NavButton } from "./nav-button";

import type { Route } from "../type";

const routes: Route[] = [
  {
    href: "/",
    icon: HomeIcon,
    label: "Home",
  },
  {
    href: "/my-documents",
    icon: BookMarkedIcon,
    label: "My Documents",
  },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <nav className="fixed left-0 top-0 bottom-0 flex-col p-4 z-40 bg-card border-r border-border hidden md:flex w-64">
      <article className="flex items-center gap-2">
        <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
          <FileTextIcon className="size-4" />
        </div>
        <h1 className="text-xl font-semibold">PDFScanner</h1>
      </article>
      <Separator className="my-3" />
      <div className="space-y-2 mb-10">
        {routes.map((route) => (
          <NavButton key={route.label} asChild active={path === route.href}>
            <Link href={route.href}>
              <route.icon />
              {route.label}
            </Link>
          </NavButton>
        ))}
      </div>
      {/* <div className="mt-auto space-y-2">
        <Separator />
        <NavButton>
          <Settings />
          Settings
        </NavButton>
      </div> */}
    </nav>
  );
}
