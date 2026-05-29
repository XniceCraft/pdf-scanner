import { Content } from "./_components/content";
import { OpenCVProvider } from "@/providers/opencv-provider";

export default function EditPage() {
  return (
    <OpenCVProvider>
      <div className="h-screen flex flex-col">
        <Content />
      </div>
    </OpenCVProvider>
  );
}
