import { Suspense } from "react";
import { Content } from "./_components/content";
import { OpenCVProvider } from "@/providers/opencv-provider";

export default function EditPage() {
  return (
    <OpenCVProvider>
      <div className="h-screen flex flex-col">
        <Suspense>
          <Content />
        </Suspense>
      </div>
    </OpenCVProvider>
  );
}
