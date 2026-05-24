import "./globals.css";
import { StrictMode } from "react";
import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";

import type { Metadata } from "next";

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
        <body
          className="font-sans antialiased min-h-full flex flex-col"
          suppressHydrationWarning
        >
          {children}
          <Toaster />
        </body>
      </html>
    </StrictMode>
  );
}
