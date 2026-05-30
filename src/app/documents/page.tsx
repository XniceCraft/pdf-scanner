import { MainLayout } from "@/components/layout/main-layout";
import { Content } from "./_components/content";
import { OpenCVProvider } from "@/providers/opencv-provider";
import { Suspense } from "react";

export default function DocumentPage() {
  return (
    <OpenCVProvider>
      <MainLayout>
        <Suspense>
          <Content />
        </Suspense>
      </MainLayout>
    </OpenCVProvider>
  );
}
