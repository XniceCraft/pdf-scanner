import { Content } from "./_components/content";
import { MenuBar } from "./_components/layout/menu-bar";
import { MainLayout } from "@/components/layout/main-layout";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Documents",
};

export default function MyDocumentPage() {
  return (
    <MainLayout>
      <MenuBar />
      <div className="max-w-5xl mx-auto w-full px-8 pt-8">
        <h1 className="text-3xl font-semibold mb-2">My Documents</h1>
        <p className="text-sm font-light mb-5 text-muted-foreground">
          Manage and continue editing your scanned files.
        </p>
        <Content />
      </div>
    </MainLayout>
  );
}
