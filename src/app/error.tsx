"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { ErrorPage } from "@/components/errors/error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <MainLayout>
      <ErrorPage error={error} reset={reset} />
    </MainLayout>
  );
}
