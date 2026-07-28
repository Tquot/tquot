import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

interface Connector {
  name: string;
  status: "connected" | "available";
}

const CONNECTORS: Connector[] = [
  { name: "Hotelbeds", status: "connected" },
  { name: "Booking.com", status: "connected" },
  { name: "Duffel", status: "connected" },
  { name: "RateHawk", status: "available" },
  { name: "Viator", status: "available" },
  { name: "Civitatis", status: "available" },
  { name: "Battleface", status: "available" },
  { name: "Smytravel", status: "available" },
];

export function ConnectorsGrid() {
  return (
    <section id="connectors" className="border-y border-border-1 bg-paper-2 py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">Integraciones</Eyebrow>
        <h2 className="mb-3 max-w-[680px] font-serif text-h1 text-ink" style={{ fontWeight: 500 }}>
          Conectado a los proveedores que ya usas.
        </h2>
        <p className="mb-10 max-w-[640px] text-[17px] text-text-2">
          Activa solo los conectores que necesitas. Más partners en roadmap.
        </p>
        <div className="grid max-w-[920px] grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {CONNECTORS.map((connector) => (
            <ConnectorCard key={connector.name} connector={connector} />
          ))}
        </div>
        <p className="mt-6 font-mono text-mono-sm text-text-3">
          Disponibilidad según plan, mercado y credenciales de tu agencia
        </p>
      </div>
    </section>
  );
}

function ConnectorCard({ connector }: { connector: Connector }) {
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
        {isConnected ? "Conectado" : "Disponible"}
      </span>
    </div>
  );
}
