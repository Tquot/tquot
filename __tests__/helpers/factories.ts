import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import { legNights } from "@/lib/agent/format";

export function createTestParsedInput(opts: {
  destination?: string;
  nights?: number;
  adults?: number;
  children?: number[];
  legs?: Array<{ destination: string; nights: number }>;
  budget?: ParsedTripInputV2["budget"];
  landmarks?: string[];
}): ParsedTripInputV2 {
  const start = "2026-10-12";
  const nights = opts.nights ?? 4;
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + nights);
  const end = endDate.toISOString().slice(0, 10);

  const legs =
    opts.legs?.map((l, i) => {
      const a = "2026-10-12";
      const d = new Date(a);
      d.setDate(d.getDate() + l.nights);
      return {
        id: `leg-${i + 1}`,
        order: i,
        origin: i === 0 ? "Madrid" : opts.legs![i - 1]!.destination,
        destination: l.destination,
        arrivalDate: a,
        departureDate: d.toISOString().slice(0, 10),
        needsAccommodation: true,
        needsTransport: "flight" as const,
        legPreferences: {
          hotelStyles: [],
          locationPriorities: [],
          locationLandmarks: opts.landmarks ?? [],
          themes: [],
          amenities: [],
          accessibility: [],
        },
      };
    }) ?? [
      {
        id: "leg-1",
        order: 0,
        origin: "Madrid",
        destination: opts.destination ?? "Roma",
        arrivalDate: start,
        departureDate: end,
        needsAccommodation: true,
        needsTransport: "flight" as const,
        legPreferences: {
          hotelStyles: [],
          locationPriorities: [],
          locationLandmarks: opts.landmarks ?? [],
          themes: [],
          amenities: [],
          accessibility: [],
        },
      },
    ];

  return {
    version: 2,
    travelers: {
      adults: opts.adults ?? 2,
      children: (opts.children ?? []).map((age) => ({ age })),
      infants: 0,
    },
    legs,
    budget: opts.budget ?? {
      kind: "exact",
      amount: 1500,
      currency: "EUR",
      perPerson: true,
    },
    preferences: {
      hotelStyles: [],
      locationPriorities: [],
      locationLandmarks: opts.landmarks ?? [],
      themes: [],
      amenities: [],
      accessibility: [],
    },
    rawInput: "test",
    parsingGaps: [],
  };
}

void legNights;
