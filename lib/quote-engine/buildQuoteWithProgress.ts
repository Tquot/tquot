import type { ParsedTripInputV2, TripLeg } from "./schemas-v2";
import {
  composeQuote,
  searchExperiences,
  searchFlights,
  searchHotels,
  searchTransfers,
  type TaggedQuoteItem,
} from "./internal";
import type { BuildEvent, QuoteSection } from "@/lib/quote-conversation/types";
import { detectGroup } from "./group/detector";
import { distributeRooms } from "./group/room-distributor";
import { createDefaultMICE } from "./group/mice-defaults";
import type { QuoteGroupDistribution } from "./types";

interface Options {
  signal?: AbortSignal;
  onEvent: (event: BuildEvent) => void;
  apiOrigin?: string;
  cookieHeader?: string;
  /** Agency base currency — loaded by the API route, not here. */
  baseCurrency?: string;
}

interface LegResults {
  flights: TaggedQuoteItem[];
  hotels: TaggedQuoteItem[];
  experiences: TaggedQuoteItem[];
  transfers: TaggedQuoteItem[];
}

export async function buildQuoteWithProgress(
  parsed: ParsedTripInputV2,
  {
    signal,
    onEvent,
    apiOrigin = "",
    cookieHeader,
    baseCurrency = "EUR",
  }: Options,
): Promise<import("./types").Quote> {
  const searchCtx = { apiOrigin, cookieHeader, baseCurrency };
  const resultsByLeg = new Map<string, LegResults>();

  const groupDetection = detectGroup(parsed);
  const groupDistribution = groupDetection.isGroup
    ? distributeRooms({ travelers: parsed.travelers })
    : null;
  const groupConfig =
    groupDetection.isGroup && groupDistribution
      ? {
          isGroup: true,
          isCorporate: groupDetection.isCorporate,
          totalPax: groupDetection.totalPax,
          detection: groupDetection,
          distribution: groupDistribution as QuoteGroupDistribution,
          mice: groupDetection.isCorporate
            ? createDefaultMICE(groupDetection.totalPax)
            : undefined,
        }
      : undefined;

  await Promise.allSettled(
    parsed.legs.map(async (leg, legIndex) => {
      const legResults: LegResults = {
        flights: [],
        hotels: [],
        experiences: [],
        transfers: [],
      };
      resultsByLeg.set(leg.id, legResults);

      async function searchSection(
        section: QuoteSection,
        l: TripLeg,
        target: LegResults,
        runner: () => Promise<TaggedQuoteItem[]>,
      ) {
        onEvent({ type: "section.started", section, legId: l.id, ts: Date.now() });
        try {
          const data = await runner();
          switch (section) {
            case "hotels":
              target.hotels = data;
              break;
            case "experiences":
              target.experiences = data;
              break;
            case "transfers":
              target.transfers = data;
              break;
          }
          onEvent({
            type: "section.done",
            section,
            legId: l.id,
            results: data,
            ts: Date.now(),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown";
          onEvent({
            type: "section.error",
            section,
            legId: l.id,
            error: message,
            skipped: true,
            ts: Date.now(),
          });
        }
      }

      await Promise.allSettled([
        searchSection("hotels", leg, legResults, async () =>
          leg.needsAccommodation
            ? await searchHotels(
                leg,
                parsed,
                legIndex,
                searchCtx,
                groupDistribution ?? undefined,
              )
            : [],
        ),
        searchSection("experiences", leg, legResults, async () =>
          await searchExperiences(leg, parsed, legIndex, searchCtx),
        ),
        searchSection("transfers", leg, legResults, async () =>
          leg.needsTransport === "flight"
            ? await searchTransfers(leg, parsed, legIndex, searchCtx)
            : [],
        ),
      ]);
    }),
  );

  for (let i = 0; i < parsed.legs.length; i++) {
    const leg = parsed.legs[i];
    if (leg.needsTransport !== "flight") continue;

    const origin = leg.origin ?? parsed.legs[i - 1]?.destination ?? null;
    if (!origin) continue;

    onEvent({ type: "section.started", section: "flights", legId: leg.id, ts: Date.now() });
    try {
      const flights = await searchFlights(
        {
          origin,
          destination: leg.destination,
          date: leg.arrivalDate,
          travelers: parsed.travelers,
        },
        leg.id,
        searchCtx,
      );
      resultsByLeg.get(leg.id)!.flights = flights;
      onEvent({
        type: "section.done",
        section: "flights",
        legId: leg.id,
        results: flights,
        ts: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      onEvent({
        type: "section.error",
        section: "flights",
        legId: leg.id,
        error: message,
        skipped: true,
        ts: Date.now(),
      });
    }
  }

  if (signal?.aborted) throw new Error("aborted");

  const allFlights: TaggedQuoteItem[] = [];
  const allHotels: TaggedQuoteItem[] = [];
  const allExperiences: TaggedQuoteItem[] = [];
  const allTransfers: TaggedQuoteItem[] = [];

  for (const results of resultsByLeg.values()) {
    allFlights.push(...results.flights);
    allHotels.push(...results.hotels);
    allExperiences.push(...results.experiences);
    allTransfers.push(...results.transfers);
  }

  const quote = composeQuote(parsed, {
    flights: allFlights,
    hotels: allHotels,
    experiences: allExperiences,
    transfers: allTransfers,
  }) as import("./types").Quote;

  if (groupConfig) {
    // Attach group configuration for downstream UI/PDF/handoff.
    quote.group = {
      distribution: groupConfig.distribution,
      isCorporate: groupConfig.isCorporate,
      totalPax: groupConfig.totalPax,
      mice: groupConfig.mice,
      detection: groupConfig.detection,
    };
  }

  // Bloque F — FX a moneda base (solo server; API pasó baseCurrency)
  const { applyBaseCurrencyToQuote } = await import(
    "@/lib/currency/apply-to-quote"
  );
  return (await applyBaseCurrencyToQuote(
    quote,
    baseCurrency,
  )) as import("./types").Quote;
}
