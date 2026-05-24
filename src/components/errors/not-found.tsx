import { Button } from "@/components/ui/button";
import { FileSearch, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface NotFoundPageProps {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function NotFoundPage({
  title = "Page not found",
  description = "The page you're looking for doesn't exist or has been moved.",
  backHref,
  backLabel = "Go back",
}: NotFoundPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center relative">
      <div
        aria-hidden="true"
        className="absolute select-none pointer-events-none -z-10 text-[14rem] sm:text-[18rem] font-black leading-none text-muted/20 tracking-tighter"
      >
        404
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl scale-150" />
        <div className="relative w-24 h-24 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10">
          <FileSearch className="w-12 h-12 text-primary" strokeWidth={1.5} />
        </div>
      </div>

      <p className="text-sm font-mono text-muted-foreground tracking-widest uppercase mb-4">
        404 · Not Found
      </p>

      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
        {title}
      </h1>

      <p className="text-base text-muted-foreground max-w-md mb-8">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {backHref && (
          <Button variant="outline" asChild className="gap-2">
            <Link href={{ pathname: backHref }}>
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Link>
          </Button>
        )}
        <Button asChild className="gap-2">
          <Link href="/">
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </Button>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.025] bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[24px_24px]" />
      </div>
    </div>
  );
}
