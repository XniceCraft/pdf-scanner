import type { ReactNode } from "react";

export function DocumentLayout({ children }: { children: ReactNode }) {
  return <div className="h-screen flex flex-col">{children}</div>;
}
