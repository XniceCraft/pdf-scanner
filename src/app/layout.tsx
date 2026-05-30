import "./globals.css";
import { StrictMode } from "react";
import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";

import type { Metadata } from "next";
import Script from "next/script";

const outfit = Outfit({
  fallback: ["sans-serif"],
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  description: "Scan your PDF files",
  title: {
    default: "PDF Scanner",
    template: "%s - PDF Scanner",
  },
  authors: [{ name: "XniceCraft", url: "https://github.com/XniceCraft" }],
  keywords: [
    "pdf",
    "scanner",
    "pdf scanner",
    "pdf scan",
    "xnicecraft",
    "image to pdf",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <StrictMode>
      <html
        lang="en"
        className={`${outfit.variable} h-full dark`}
        suppressHydrationWarning
      >
        <head>
          <Script
            src="//unpkg.com/react-scan/dist/auto.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        </head>
        <body
          className="font-sans antialiased min-h-full flex flex-col"
          suppressHydrationWarning
        >
          <NuqsAdapter>
            <TooltipProvider>{children}</TooltipProvider>
          </NuqsAdapter>
          <Toaster />
        </body>
      </html>
    </StrictMode>
  );
}
