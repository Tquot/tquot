import type { DashboardTranslation } from "@/app/dashboard/translations";

type ProductMockProps = {
  t: DashboardTranslation;
};

const MOCK_FLIGHTS = [
  {
    airline: "Iberia",
    route: "MAD → FCO",
    time: "08:40 – 11:15",
    price: "€186",
    selected: true,
  },
  {
    airline: "Vueling",
    route: "MAD → FCO",
    time: "14:20 – 17:05",
    price: "€142",
    selected: false,
  },
  {
    airline: "ITA Airways",
    route: "FCO → MAD",
    time: "18:30 – 20:55",
    price: "€198",
    selected: false,
  },
] as const;

const MOCK_HOTELS = [
  {
    name: "Hotel Artemide",
    city: "Roma",
    price: "€1.240",
    selected: true,
  },
  {
    name: "Hotel L'Orologio",
    city: "Florencia",
    price: "€980",
    selected: false,
  },
] as const;

export function LandingProductMock({ t }: ProductMockProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-tquot-border bg-tquot-surface shadow-xl ring-1 ring-tquot-border/60">
      <div className="flex items-center gap-2 border-b border-tquot-border bg-tquot-bg/80 px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-tquot-warm" />
        <div className="h-2.5 w-2.5 rounded-full bg-tquot-accent/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-tquot-teal" />
        <span className="ml-2 text-xs font-medium text-tquot-muted">
          TQuot — Nueva cotización
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="border-b border-tquot-border bg-gradient-to-b from-tquot-bg to-tquot-surface p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-tquot-teal">
            Petición del cliente
          </p>
          <div className="rounded-xl border border-tquot-border bg-white p-3 text-sm leading-relaxed text-tquot-text shadow-sm">
            {t.landingMockRequest}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[t.landingMockStepParse, t.landingMockStepMap, t.landingMockStepBuild].map(
              (step, index) => (
                <span
                  key={step}
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    index < 2
                      ? "bg-tquot-teal/15 text-tquot-teal"
                      : "border border-tquot-teal/40 bg-tquot-teal text-white"
                  }`}
                >
                  {step}
                </span>
              ),
            )}
          </div>
          <div className="mt-4 space-y-2 font-mono text-xs text-tquot-muted">
            <p>
              <span className="text-tquot-teal">→</span> Destino: Roma + Florencia
            </p>
            <p>
              <span className="text-tquot-accent">✓</span> 4 viajeros · 10 noches
            </p>
            <p>
              <span className="text-tquot-warm">+</span> Margen 18% aplicado
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <h4 className="mb-3 text-sm font-bold text-tquot-text">
            {t.landingMockFlightsTitle}
          </h4>
          <div className="overflow-x-auto rounded-xl border border-tquot-border">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="border-b border-tquot-border bg-tquot-bg/80 text-[10px] font-semibold uppercase tracking-wide text-tquot-muted">
                  <th className="px-3 py-2">{t.landingMockFlightColAirline}</th>
                  <th className="px-3 py-2">{t.landingMockFlightColRoute}</th>
                  <th className="px-3 py-2">{t.landingMockFlightColTime}</th>
                  <th className="px-3 py-2 text-right">{t.landingMockFlightColPrice}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {MOCK_FLIGHTS.map((flight) => (
                  <tr
                    key={`${flight.airline}-${flight.time}`}
                    className={`border-b border-tquot-border last:border-0 ${
                      flight.selected ? "bg-tquot-teal/5" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-medium text-tquot-text">
                      {flight.airline}
                    </td>
                    <td className="px-3 py-2.5 text-tquot-muted">{flight.route}</td>
                    <td className="px-3 py-2.5 text-tquot-muted">{flight.time}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-tquot-text">
                      {flight.price}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {flight.selected ? (
                        <span className="rounded-full bg-tquot-teal px-2 py-0.5 text-[10px] font-bold text-white">
                          {t.landingMockFlightUse}
                        </span>
                      ) : (
                        <span className="rounded-full border border-tquot-border px-2 py-0.5 text-[10px] font-medium text-tquot-muted">
                          {t.landingMockFlightUse}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="mb-3 mt-6 text-sm font-bold text-tquot-text">
            {t.landingMockHotelsTitle}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {MOCK_HOTELS.map((hotel) => (
              <article
                key={hotel.name}
                className={`rounded-xl border p-3 transition-shadow ${
                  hotel.selected
                    ? "border-2 border-tquot-teal bg-gradient-to-r from-tquot-teal/5 to-white ring-1 ring-tquot-teal/20"
                    : "border-tquot-border bg-white"
                }`}
              >
                <p className="font-semibold text-tquot-text">{hotel.name}</p>
                <p className="text-xs text-tquot-muted">
                  {hotel.city} · {t.landingMockHotelBoard} · {t.landingMockHotelNights}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-bold tabular-nums text-tquot-text">
                    {hotel.price}
                  </span>
                  {hotel.selected ? (
                    <span className="text-[10px] font-bold uppercase text-tquot-teal">
                      {t.landingMockHotelUse}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
