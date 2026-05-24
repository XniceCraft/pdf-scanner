import { Content } from "./_components/content";
import { MainLayout } from "@/components/layout/main-layout";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Documents",
};

export default function MyDocumentPage() {
  return (
    <MainLayout>
      <div className="px-8 pt-8">
        <h1 className="text-2xl font-semibold mb-5">My Documents</h1>
        <Content />
      </div>
    </MainLayout>
  );
}
