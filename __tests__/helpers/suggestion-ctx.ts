import type { Quote, QuoteItem } from "@/lib/quotes/build-quote";
import type { Flight, Hotel, Transfer } from "@/lib/quote-engine/types";
import type { SuggestionContext } from "@/lib/agent/suggestions/types";
import type { ComparatorEntry } from "@/lib/comparator/types";
import { createTestParsedInput } from "./factories";

function emptyQuote(partial?: Partial<Quote>): Quote {
  return {
    id: "q1",
    summary: {
      route: "MAD-FCO",
      durationDays: 5,
      passengers: { adults: 2, children: 0, total: 2 },
    },
    flights: [],
    hotels: [],
    experiences: [],
    transfers: [],
    pricing: {
      baseTotal: 2000,
      margin: 200,
      finalTotal: 2200,
      currency: "EUR",
    },
    _meta: {
      flightsSource: "mock",
      hotelsSource: "mock",
      experiencesSource: "mock",
      transfersSource: "mock",
    },
    ...partial,
  };
}

function flightItem(opts: {
  id: string;
  price: number;
  stops: number;
  alternative?: boolean;
}): QuoteItem {
  return {
    id: opts.id,
    type: "flight",
    title: "Flight",
    provider: "IB",
    price: opts.price,
    markup: 0,
    finalPrice: opts.price,
    source: "mock",
    alternative: opts.alternative,
    flightDetails: {
      departureDate: "2026-10-12",
      departureTime: "07:00",
      arrivalTime: "09:00",
      duration: "2h",
      originIata: "MAD",
      destinationIata: "FCO",
      originCity: "Madrid",
      destinationCity: "Roma",
      airline: "IB",
      airlineLogoUrl: "",
      flightNumber: "IB1",
      cabinClass: "ECONOMY",
      baggageIncluded: "1×23kg",
      layovers: [],
      stops: opts.stops,
      priceNumeric: opts.price,
    },
  };
}

function hotelItem(opts: {
  id: string;
  price: number;
  alternative?: boolean;
}): QuoteItem {
  return {
    id: opts.id,
    type: "hotel",
    title: "Hotel · 4★ · Roma",
    provider: "own",
    price: opts.price,
    markup: 0,
    finalPrice: opts.price,
    source: "mock",
    alternative: opts.alternative,
    hotelDetails: {
      provider: "hotelbeds",
      netPrice: opts.price / 4,
      currency: "EUR",
      fetchedAt: new Date().toISOString(),
      boardCode: "BB",
      boardOptions: [],
    },
  };
}

export function makeCtx(opts: {
  chosenFlight?: { price: number; stops: number };
  candidateFlights?: Array<{
    id: string;
    price: number;
    stops: number;
    carrier: string;
  }>;
  everythingSuggestible?: boolean;
  dismissed?: string[];
  comparatorSaving?: number;
  boardUpgradeAvailable?: boolean;
  corruptHotel?: boolean;
}): SuggestionContext {
  const parsed = createTestParsedInput({
    budget: {
      kind: "exact",
      amount: 800,
      currency: "EUR",
      perPerson: true,
    },
  });

  if (opts.everythingSuggestible) {
    const flights: Flight[] = [
      {
        id: "f-chosen",
        legId: "leg-1",
        carrier: "VY",
        price: 120,
        currency: "EUR",
        slices: [
          {
            departureDate: "2026-10-12",
            segments: [
              {
                origin: { iata_code: "MAD" },
                destination: { iata_code: "CDG" },
              },
              {
                origin: { iata_code: "CDG" },
                destination: { iata_code: "FCO" },
              },
            ],
          },
        ],
      },
      {
        id: "f-direct",
        legId: "leg-1",
        carrier: "IB",
        price: 165,
        currency: "EUR",
        slices: [
          {
            departureDate: "2026-10-12",
            segments: [
              {
                origin: { iata_code: "MAD" },
                destination: { iata_code: "FCO" },
              },
            ],
          },
        ],
      },
    ];
    const hotels: Hotel[] = [
      {
        id: "h1",
        legId: "leg-1",
        name: "Hotel A",
        netPrice: 300,
        currency: "EUR",
        nights: 4,
        stars: 4,
        provider: "own",
        fetchedAt: new Date().toISOString(),
        refundable: false,
        cancellationDeadline: new Date(
          Date.now() + 3 * 86_400_000,
        ).toISOString(),
        boardCode: "BB",
        boardOptions: [
          {
            boardCode: "BB",
            boardLabel: "AD",
            rateKey: "r1",
            netPrice: 300,
            totalPrice: 1200,
            currency: "EUR",
            refundable: false,
            available: true,
          },
          {
            boardCode: "HB",
            boardLabel: "MP",
            rateKey: "r2",
            netPrice: 320,
            totalPrice: 1280,
            currency: "EUR",
            refundable: true,
            available: true,
          },
        ],
      },
      {
        id: "h1-ref",
        legId: "leg-1",
        name: "Hotel A",
        netPrice: 310,
        currency: "EUR",
        nights: 4,
        stars: 4,
        provider: "own",
        fetchedAt: new Date().toISOString(),
        refundable: true,
      },
      {
        id: "h-cheap",
        legId: "leg-1",
        name: "Hotel Cheap",
        netPrice: 180,
        currency: "EUR",
        nights: 4,
        stars: 3,
        provider: "own",
        fetchedAt: new Date().toISOString(),
        refundable: true,
      },
    ];
    const transfers: Transfer[] = [
      {
        id: "t1",
        legId: "leg-1",
        price: 90,
        currency: "EUR",
      },
    ];
    const comparator: ComparatorEntry[] = [
      {
        provider: "own",
        source: "snapshot",
        available: true,
        totalPrice: 1200,
        currency: "EUR",
        nights: 4,
        hotelName: "Hotel A",
        fetchedAt: new Date().toISOString(),
        ageMinutes: 0,
      },
      {
        provider: "hotelbeds",
        source: "live",
        available: true,
        totalPrice: 1120,
        currency: "EUR",
        nights: 4,
        hotelName: "Hotel A",
        fetchedAt: new Date().toISOString(),
        ageMinutes: 0,
      },
    ];

    return {
      quote: emptyQuote({
        flights: [flightItem({ id: "f-chosen", price: 120, stops: 1 })],
        hotels: [hotelItem({ id: "h1", price: 1200 })],
        pricing: {
          baseTotal: 2500,
          margin: 200,
          finalTotal: 2700,
          currency: "EUR",
        },
      }),
      parsed,
      candidates: { flights, hotels, experiences: [], transfers },
      comparator,
      agency: { accessibilityDefault: false, defaultMarginPct: 12 },
      dismissed: opts.dismissed ?? [],
    };
  }

  const chosenPrice = opts.chosenFlight?.price ?? 120;
  const chosenStops = opts.chosenFlight?.stops ?? 1;
  const candidateFlights: Flight[] = (opts.candidateFlights ?? []).map(
    (f) => ({
      id: f.id,
      legId: "leg-1",
      carrier: f.carrier,
      price: f.price,
      currency: "EUR",
      slices: [
        {
          departureDate: "2026-10-12",
          segments:
            f.stops === 0
              ? [
                  {
                    origin: { iata_code: "MAD" },
                    destination: { iata_code: "FCO" },
                  },
                ]
              : [
                  {
                    origin: { iata_code: "MAD" },
                    destination: { iata_code: "CDG" },
                  },
                  {
                    origin: { iata_code: "CDG" },
                    destination: { iata_code: "FCO" },
                  },
                ],
        },
      ],
    }),
  );

  const hotels: Hotel[] = opts.corruptHotel
    ? ([null as unknown as Hotel])
    : opts.boardUpgradeAvailable
      ? [
          {
            id: "h1",
            legId: "leg-1",
            name: "Hotel A",
            netPrice: 200,
            currency: "EUR",
            nights: 4,
            stars: 4,
            provider: "own",
            fetchedAt: new Date().toISOString(),
            boardCode: "BB",
            boardOptions: [
              {
                boardCode: "BB",
                boardLabel: "AD",
                rateKey: "r1",
                netPrice: 200,
                totalPrice: 800,
                currency: "EUR",
                refundable: true,
                available: true,
              },
              {
                boardCode: "HB",
                boardLabel: "MP",
                rateKey: "r2",
                netPrice: 220,
                totalPrice: 880,
                currency: "EUR",
                refundable: true,
                available: true,
              },
            ],
          },
        ]
      : [];

  const comparator: ComparatorEntry[] | undefined =
    opts.comparatorSaving != null
      ? [
          {
            provider: "own",
            source: "snapshot",
            available: true,
            totalPrice: 1000,
            currency: "EUR",
            nights: 4,
            hotelName: "Hotel A",
            fetchedAt: new Date().toISOString(),
            ageMinutes: 0,
          },
          {
            provider: "hotelbeds",
            source: "live",
            available: true,
            totalPrice: 1000 - opts.comparatorSaving,
            currency: "EUR",
            nights: 4,
            hotelName: "Hotel A",
            fetchedAt: new Date().toISOString(),
            ageMinutes: 0,
          },
        ]
      : undefined;

  return {
    quote: emptyQuote({
      flights: [
        flightItem({
          id: "chosen",
          price: chosenPrice,
          stops: chosenStops,
        }),
      ],
      hotels: hotels[0]
        ? [hotelItem({ id: hotels[0].id, price: hotels[0].netPrice * 4 })]
        : [],
    }),
    parsed,
    candidates: {
      flights: [
        {
          id: "chosen",
          legId: "leg-1",
          carrier: "VY",
          price: chosenPrice,
          currency: "EUR",
          slices: [
            {
              departureDate: "2026-10-12",
              segments:
                chosenStops === 0
                  ? [
                      {
                        origin: { iata_code: "MAD" },
                        destination: { iata_code: "FCO" },
                      },
                    ]
                  : [
                      {
                        origin: { iata_code: "MAD" },
                        destination: { iata_code: "CDG" },
                      },
                      {
                        origin: { iata_code: "CDG" },
                        destination: { iata_code: "FCO" },
                      },
                    ],
            },
          ],
        },
        ...candidateFlights,
      ],
      hotels,
      experiences: [],
      transfers: [],
    },
    comparator,
    agency: { accessibilityDefault: false, defaultMarginPct: 12 },
    dismissed: opts.dismissed ?? [],
  };
}
