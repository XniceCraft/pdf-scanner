"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HomeIcon, BookMarkedIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

import type { Route } from "./type";

const routes: Route[] = [
  {
    label: "Home",
    href: "/",
    icon: HomeIcon,
  },
  {
    label: "My Documents",
    href: "/my-documents",
    icon: BookMarkedIcon,
  },
];

export function BottomNavigation() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 md:hidden bg-background border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      {routes.map((route) => {
        return (
          <Button
            key={route.label}
            asChild
            variant="ghost"
            className={cn(
              "flex-col text-muted-foreground h-auto py-2 px-4 hover:bg-muted",
              route.href === path && "text-primary bg-primary/5"
            )}
          >
            <Link href={route.href}>
              <route.icon />
              {route.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
