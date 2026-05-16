import type { Metadata } from "next";
import { Sarabun, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OLX Course Builder",
  description: "Author Open edX courses and Content Libraries (v1/v2) in the browser. Imports OLX tar.gz / Library v2 zip / Markdown outlines; exports Studio-ready bundles for Ulmo and beyond.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${sarabun.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
