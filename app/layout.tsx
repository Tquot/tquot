import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Fraunces } from "next/font/google";
import { SiteLanguageProvider } from "./language-provider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "TQuot — AI quote engine for travel agencies",
  description:
    "Transform any client request into a professional PDF quote in under 60 seconds. The AI-powered quotation engine built for travel agencies.",
  openGraph: {
    title: "TQuot — AI quote engine for travel agencies",
    description:
      "Transform any client request into a professional PDF quote in under 60 seconds.",
    url: "https://tquot.io",
    siteName: "TQuot",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable}`}
    >
      <body className="min-h-screen bg-paper font-sans text-text antialiased">
        <SiteLanguageProvider>{children}</SiteLanguageProvider>
      </body>
    </html>
  );
}
