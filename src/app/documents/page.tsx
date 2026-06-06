import { MainLayout } from "@/components/layout/main-layout";
import { Content } from "./_components/content";
import { Suspense } from "react";

export default function DocumentPage() {
  return (
    <MainLayout>
      <Suspense>
        <Content />
      </Suspense>
    </MainLayout>
  );
}
