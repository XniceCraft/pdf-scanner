"use client";

import { Content } from "./_components/content";
import { Suspense } from "react";
import { OpenCVProvider } from "@/providers/opencv-provider";

export default function DocumentPage() {
  return (
    <div className="h-screen flex flex-col">
      <Suspense>
        <OpenCVProvider>
          <Content />
        </OpenCVProvider>
      </Suspense>
    </div>
  );
}
