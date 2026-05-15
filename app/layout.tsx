import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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
    <html lang="en" className="dark">
      <body
        className={`${jakarta.variable} ${outfit.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
