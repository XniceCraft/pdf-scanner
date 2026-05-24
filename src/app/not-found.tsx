import { NotFoundPage } from "@/components/errors/not-found";
import { MainLayout } from "@/components/layout/main-layout";

export default function NotFound() {
  return (
    <MainLayout>
      <NotFoundPage />
    </MainLayout>
  );
}
