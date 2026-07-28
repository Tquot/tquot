import type { Metadata } from "next";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { InventorySection } from "@/components/landing/InventorySection";
import { ActivitiesSection } from "@/components/landing/ActivitiesSection";
import { ComparatorBlock } from "@/components/landing/ComparatorBlock";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PlatformGrid } from "@/components/landing/PlatformGrid";
import { ConnectorsGrid } from "@/components/landing/ConnectorsGrid";
import { PDFShowcase } from "@/components/landing/PDFShowcase";
import { ROIBlock } from "@/components/landing/ROIBlock";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export const metadata: Metadata = {
  title: "TQuot — De email a cotización en 60 segundos",
  description:
    "TQuot convierte peticiones en lenguaje natural en propuestas profesionales con vuelos, hoteles y experiencias. Con tus márgenes. Con tu marca.",
  openGraph: {
    title: "TQuot — De email a cotización en 60 segundos",
    description:
      "TQuot convierte peticiones en lenguaje natural en propuestas profesionales con vuelos, hoteles y experiencias. Con tus márgenes. Con tu marca.",
    siteName: "TQuot",
    url: "https://tquot.io",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="bg-paper">
      <MarketingNav />
      <main>
        <LandingHero />
        <LiveDemo />
        <InventorySection />
        <ActivitiesSection />
        <ComparatorBlock />
        <HowItWorks />
        <PlatformGrid />
        <ConnectorsGrid />
        <PDFShowcase />
        <ROIBlock />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
