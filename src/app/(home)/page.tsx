import { Content } from "./_components/content";
import { MainLayout } from "@/components/layout/main-layout";

export default function HomePage() {
  return (
    <MainLayout className="h-screen max-h-screen overflow-hidden">
      <div className="flex flex-col max-w-5xl mx-auto w-full p-8 h-full">
        <section className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            Welcome to PDFScanner
          </h1>
          <p className="text-base text-muted-foreground">
            Let&apos;s get started with your document scan.
          </p>
        </section>
        <Content />
      </div>
    </MainLayout>
  );
}
