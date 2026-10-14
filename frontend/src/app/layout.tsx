import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CompareToast from "@/components/compare/CompareToast";
import ContactModal from "@/components/modals/ContactModal";

import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "LawyerComparison - Premium Legal Representation",
  description: "Find the best lawyers and attorneys in the US. The premier directory for legal representation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >

      <body className="min-h-full flex flex-col bg-color-background text-color-foreground">

        <Navbar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
        <CompareToast />
        <ContactModal />
        <Toaster position="top-center" richColors theme="light" />
      </body>
    </html>
  );
}
