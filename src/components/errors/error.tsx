"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: string;
}

export function ErrorPage({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred while processing your request.",
}: ErrorPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-destructive/20 blur-2xl scale-150 animate-pulse" />
        <div className="relative w-24 h-24 bg-destructive/10 border border-destructive/30 rounded-2xl flex items-center justify-center shadow-lg shadow-destructive/10">
          <AlertTriangle className="w-12 h-12 text-destructive" strokeWidth={1.5} />
        </div>
      </div>

      <p className="text-sm font-mono text-muted-foreground tracking-widest uppercase mb-4">
        Error{error?.digest ? ` · ${error.digest}` : ""}
      </p>

      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
        {title}
      </h1>

      <p className="text-base text-muted-foreground max-w-md mb-2">
        {description}
      </p>

      {process.env.NODE_ENV === "development" && error?.message && (
        <div className="mt-4 mb-6 w-full max-w-lg rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-left">
          <p className="text-xs font-mono text-destructive/80 break-all">
            {error.message}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        {reset && (
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
        )}
        <Button variant="outline" asChild className="gap-2">
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
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.03] bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[40px_40px]" />
      </div>
    </div>
  );
}
