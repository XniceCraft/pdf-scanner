import { DocumentLayout } from "@/components/layout/document-layout";
import { Content } from "./_components/content";
import { Suspense } from "react";

export default function DocumentPage() {
  return (
    <DocumentLayout>
      <Suspense>
        <Content />
      </Suspense>
    </DocumentLayout>
  );
}
