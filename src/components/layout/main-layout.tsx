import { Folder, Home, Scan, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

export function MainLayout({
  children,
  className,
  disableSidebar,
}: {
  children: React.ReactNode;
  className?: string;
  disableSidebar?: boolean;
}) {
  return (
    <>
      {!disableSidebar && <Sidebar />}
      <main
        className={cn(
          "min-h-screen flex flex-col w-full",
          !disableSidebar && "md:pl-64",
          className
        )}
      >
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 md:hidden bg-background border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <Button
          variant="ghost"
          className="flex flex-col items-center justify-center text-muted-foreground h-auto py-2 px-4 hover:bg-muted"
        >
          <Home className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium">Home</span>
        </Button>
        <Button className="flex flex-col items-center justify-center rounded-full h-14 w-14 -mt-6 shadow-lg shadow-primary/20">
          <Scan className="h-6 w-6" />
          <span className="sr-only">Scan</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-col items-center justify-center text-muted-foreground h-auto py-2 px-4 hover:bg-muted"
        >
          <Folder className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium">Files</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-col items-center justify-center text-muted-foreground h-auto py-2 px-4 hover:bg-muted"
        >
          <Settings className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium">Settings</span>
        </Button>
      </nav>
    </>
  );
}
