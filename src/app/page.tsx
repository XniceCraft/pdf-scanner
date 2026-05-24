"use client";

import { useRouter } from "next/navigation";
import { Controller, type SubmitErrorHandler, useForm } from "react-hook-form";
import { Crop, FileUp, Palette, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { MainLayout } from "@/components/layout/main-layout";
import { imageValidation } from "@/lib/validations/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import documentService from "@/lib/services/document";

const formSchema = z.object({
  images: imageValidation(),
});

export default function HomePage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      images: [],
    },
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const name = new Date().toISOString().slice(0, 10);
    const id = await documentService.create({ name }, data.images);
    if (!id) toast.error("Failed to create document");

    router.push(`/documents?id=${id}`);
  };

  const onError: SubmitErrorHandler<z.infer<typeof formSchema>> = (errors) => {
    toast.error(errors.images?.message ?? "Invalid images");
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto w-full px-8 pt-8">
        <section className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            Welcome to PDFScanner
          </h1>
          <p className="text-base text-muted-foreground">
            Let&apos;s get started with your document scan.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="md:col-span-2"
          >
            <Controller
              name="images"
              control={form.control}
              render={({ field }) => (
                <FileUpload
                  value={field.value}
                  onValueChange={field.onChange}
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                >
                  <FileUploadDropzone className="border-dashed border-2 border-border bg-muted/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-muted/30 transition-colors min-h-100">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors group-hover:text-primary">
                      <FileUp className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2 text-primary">
                      Drag & Drop Documents
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-sm mb-10">
                      Upload your PDF, JPG, or PNG files to start processing.
                      We&apos;ll automatically optimize every page for maximum
                      clarity.
                    </p>
                    <FileUploadTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-fit"
                      >
                        Browse files
                      </Button>
                    </FileUploadTrigger>
                  </FileUploadDropzone>
                  <FileUploadList>
                    {field.value.map((file, index) => (
                      <FileUploadItem key={index} value={file}>
                        <FileUploadItemPreview />
                        <FileUploadItemMetadata />
                        <FileUploadItemDelete asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                          >
                            <XIcon />
                          </Button>
                        </FileUploadItemDelete>
                      </FileUploadItem>
                    ))}
                  </FileUploadList>
                </FileUpload>
              )}
            />

            {form.formState.isDirty && (
              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Scanning..." : "Scan"}
              </Button>
            )}
          </form>

          <div className="flex flex-col gap-6">
            <Card className="border-border bg-card rounded-xl">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Auto Shadow Removal
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Intelligent neural engine detects and removes shadows from
                    warped pages automatically.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card rounded-xl">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-accent-foreground">
                  <Crop className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Smart Edge Detection
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Perfectly align your documents with our high-precision
                    boundary recognition technology.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
