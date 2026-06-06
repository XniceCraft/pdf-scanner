import { Suspense } from "react";
import { Content } from "./_components/content";

export default function EditPage() {
  return (
    <div className="h-screen flex flex-col">
      <Suspense>
        <Content />
      </Suspense>
    </div>
  );
}
