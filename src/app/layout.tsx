import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "MindPulse — Empathetic Mental Wellness Companion for Competitive Exam Aspirants",
  description: "De-stress, track mood patterns, analyze mock test stress, and get real-time coping strategies while preparing for JEE, NEET, UPSC, GATE, and other competitive exams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${notoDevanagari.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F9FAFB] text-[#111827] selection:bg-blue-500/20 selection:text-blue-700">
        <TooltipProvider>
          {children}
          <Toaster theme="dark" position="top-right" closeButton richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
