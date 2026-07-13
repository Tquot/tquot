import type { AgencyBranding } from "@/lib/branding/types";
import type { Quote } from "@/lib/quote-engine/types";
import type { QuoteItem } from "@/lib/quotes/build-quote";
import { itemsForPricing } from "@/lib/quotes/build-quote";

interface Props {
  quote: Quote;
  branding?: AgencyBranding;
}

export function PublicQuoteView({ quote, branding }: Props) {
  const primaryColor = branding?.primaryColor ?? "#0d9488";
  const hotels = itemsForPricing(quote.hotels);
  const flights = itemsForPricing(quote.flights);
  const experiences = itemsForPricing(quote.experiences);
  const transfers = itemsForPricing(quote.transfers);
  const destination =
    quote.summary?.route?.split("→").pop()?.trim() ??
    quote.hotels[0]?.title ??
    "tu destino";

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="px-8 py-12 text-white" style={{ backgroundColor: primaryColor }}>
        <div className="mx-auto max-w-3xl">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="mb-4 h-10" />
          ) : null}
          <h1 className="text-3xl font-bold">Tu viaje a {destination}</h1>
          <p className="mt-1 text-lg opacity-90">{quote.summary.route}</p>
          <p className="mt-1 text-sm opacity-80">
            {quote.summary.durationDays} días · {quote.summary.passengers.total}{" "}
            viajeros
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <PublicItemList title="Hoteles" items={hotels} />
        <PublicItemList title="Vuelos" items={flights} />
        <PublicItemList title="Traslados" items={transfers} />
        <PublicItemList title="Experiencias" items={experiences} />

        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">Total del viaje</h2>
          <div className="text-3xl font-bold" style={{ color: primaryColor }}>
            {Math.round(quote.pricing.finalTotal).toLocaleString("es-ES")}{" "}
            {quote.pricing.currency}
          </div>
        </section>
      </main>

      <footer className="mt-8 border-t border-neutral-200 py-6 text-center text-sm text-neutral-500">
        {branding?.agencyLegalName ? (
          <div className="font-medium text-neutral-700">
            {branding.agencyLegalName}
          </div>
        ) : null}
        {branding?.agencyEmail ? <div>{branding.agencyEmail}</div> : null}
        {branding?.agencyPhone ? <div>{branding.agencyPhone}</div> : null}
      </footer>
    </div>
  );
}

function PublicItemList({
  title,
  items,
}: {
  title: string;
  items: QuoteItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <div className="font-medium text-neutral-900">{item.title}</div>
              {item.description ? (
                <div className="mt-0.5 text-sm text-neutral-600">
                  {item.description}
                </div>
              ) : null}
              <div className="mt-0.5 text-xs text-neutral-500">{item.provider}</div>
            </div>
            <div className="shrink-0 text-sm font-semibold tabular-nums">
              {Math.round(item.finalPrice).toLocaleString("es-ES")} €
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
