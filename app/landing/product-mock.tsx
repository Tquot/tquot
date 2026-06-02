import type { DashboardTranslation } from "@/app/dashboard/translations";

const LANZAROTE_HOTEL_PHOTO =
  "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=480&h=240&fit=crop&q=80";

type ProductMockProps = {
  t: DashboardTranslation;
};

const MOCK_FLIGHTS = [
  {
    airline: "Iberia",
    route: "MAD → ACE",
    time: "07:15 – 09:40",
    price: "€218",
    selected: true,
  },
  {
    airline: "Vueling",
    route: "MAD → ACE",
    time: "13:05 – 15:25",
    price: "€164",
    selected: false,
  },
  {
    airline: "Iberia",
    route: "ACE → MAD",
    time: "17:50 – 22:05",
    price: "€231",
    selected: true,
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
        <div className="flex flex-col border-b border-tquot-border bg-gradient-to-b from-tquot-bg to-tquot-surface p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-tquot-teal font-[family-name:var(--font-outfit)] text-xs font-bold text-white">
              Q
            </span>
            <p className="text-sm font-bold text-tquot-text">{t.landingMockAgentTitle}</p>
          </div>

          <div className="flex min-h-[200px] flex-1 flex-col gap-3">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-tquot-muted">
                {t.landingMockChatAgentLabel}
              </span>
              <div className="max-w-[95%] rounded-2xl rounded-tr-sm border border-tquot-border bg-white px-3 py-2.5 text-sm leading-relaxed text-tquot-text shadow-sm">
                {t.landingMockChatAgentMessage}
              </div>
            </div>

            <div className="flex items-center gap-1 px-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tquot-muted" />
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-tquot-muted"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-tquot-muted"
                style={{ animationDelay: "300ms" }}
              />
            </div>

            <div className="flex flex-col items-start gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-tquot-teal">
                {t.landingMockChatTquotLabel}
              </span>
              <div className="max-w-[95%] rounded-2xl rounded-tl-sm border border-tquot-teal/25 bg-tquot-teal/10 px-3 py-2.5 text-sm leading-relaxed text-tquot-text">
                {t.landingMockChatTquotMessage}
              </div>
            </div>
          </div>

          <article className="mt-4 overflow-hidden rounded-xl border-2 border-tquot-teal bg-white shadow-sm ring-1 ring-tquot-teal/20">
            <img
              src={LANZAROTE_HOTEL_PHOTO}
              alt={t.landingMockHotelResultPhotoAlt}
              className="h-28 w-full object-cover"
              loading="lazy"
            />
            <div className="p-3">
              <p className="font-semibold text-tquot-text">{t.landingMockHotelResultName}</p>
              <p className="text-xs text-tquot-muted">{t.landingMockHotelResultLocation}</p>
              <p className="mt-1 text-xs text-tquot-muted">{t.landingMockHotelResultMeta}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-base font-bold tabular-nums text-tquot-teal">
                  {t.landingMockHotelResultPrice}
                </span>
                <span className="rounded-full bg-tquot-teal px-2 py-0.5 text-[10px] font-bold text-white">
                  {t.landingMockHotelUse}
                </span>
              </div>
            </div>
          </article>
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

          <div className="mt-4 flex flex-wrap gap-2">
            {[t.landingMockStepParse, t.landingMockStepMap, t.landingMockStepBuild].map(
              (step, index) => (
                <span
                  key={step}
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    index === 2
                      ? "border border-tquot-teal/40 bg-tquot-teal text-white"
                      : "bg-tquot-teal/15 text-tquot-teal"
                  }`}
                >
                  {step}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
