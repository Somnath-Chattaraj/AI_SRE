import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const geistMonoHeading = Geist_Mono({ subsets: ["latin"], variable: "--font-heading" });
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "AutoHeal — AI-Powered Self-Healing Platform",
  description:
    "Intelligent blackbox monitoring with automated anomaly detection, root cause analysis, and self-healing via AI-generated pull requests.",
  keywords: ["monitoring", "AI", "self-healing", "DevOps", "observability", "SRE"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased dark",
        fontMono.variable,
        "font-sans",
        geist.variable,
        geistMonoHeading.variable,
      )}
    >
      <body className="min-h-screen bg-background">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
