import { Content } from "./_components/content";
import { Suspense } from "react";

export default function DocumentPage() {
  return (
    <div className="h-screen flex flex-col">
      <Suspense>
        <Content />
      </Suspense>
    </div>
  );
}
