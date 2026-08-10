"use client";

import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

interface Connector {
  name: string;
  status: "connected" | "available";
}

export function ConnectorsGrid() {
  const { t } = useSiteLanguage();

  const CONNECTORS: Connector[] = [
    { name: t.landingConnectorHotelbeds, status: "connected" },
    { name: t.landingConnectorBooking, status: "connected" },
    { name: t.landingConnectorDuffel, status: "connected" },
    { name: t.landingConnectorRateHawk, status: "available" },
    { name: t.landingConnectorViator, status: "available" },
    { name: t.landingConnectorCivitatis, status: "available" },
    { name: t.landingConnectorBattleface, status: "available" },
    { name: t.landingConnectorSmytravel, status: "available" },
  ];

  return (
    <section id="connectors" className="border-y border-border-1 bg-paper-2 py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">{t.landingConnectorsEyebrow}</Eyebrow>
        <h2 className="mb-3 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          {t.landingConnectorsTitleUi}
        </h2>
        <p className="mb-10 max-w-[640px] text-[17px] text-text-2">
          {t.landingConnectorsSubtitle}
        </p>
        <div className="grid max-w-[920px] grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {CONNECTORS.map((connector) => (
            <ConnectorCard
              key={connector.name}
              connector={connector}
              statusConnected={t.landingConnectorStatusConnected}
              statusAvailable={t.landingConnectorStatusAvailable}
            />
          ))}
        </div>
        <p className="mt-6 font-mono text-mono-sm text-text-3">
          {t.landingConnectorsDisclaimer}
        </p>
      </div>
    </section>
  );
}

function ConnectorCard({
  connector,
  statusConnected,
  statusAvailable,
}: {
  connector: Connector;
  statusConnected: string;
  statusAvailable: string;
}) {
  const isConnected = connector.status === "connected";

  return (
    <div className="rounded-lg border border-border-1 bg-paper p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-serif text-[18px] text-ink" style={{ fontWeight: 500 }}>
          {connector.name}
        </span>
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isConnected ? "bg-success" : "bg-text-3",
          )}
        />
      </div>
      <span
        className={cn(
          "font-mono text-[10px] uppercase tracking-wider",
          isConnected ? "text-success" : "text-text-3",
        )}
      >
        {isConnected ? statusConnected : statusAvailable}
      </span>
    </div>
  );
}
