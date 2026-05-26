import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import { BottomNavigation } from "./bottom-navigation";

export function MainLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <Sidebar />
      <main
        className={cn("min-h-screen flex flex-col w-full md:pl-64", className)}
      >
        {children}
      </main>
      <BottomNavigation />
    </>
  );
}
