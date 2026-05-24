import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ComponentProps } from "react";

type Props = {
  active?: boolean;
} & ComponentProps<typeof Button>;

export function NavButton({ active, className, ...props }: Props) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className={cn(
        "w-full justify-start py-6 gap-4",
        active
          ? "font-semibold"
          : "font-medium text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}
