import "server-only";

import type { BoardOption, Experience, Flight, Hotel } from "@/lib/quote-engine/types";
import type { QuoteItem } from "@/lib/quotes/build-quote";
import type { TaggedQuoteItem } from "@/lib/quote-engine/internal";
import { DEMO_SUGGESTION } from "./constants";
import { buildDemoParsed, demoDates } from "./demo-parsed";

export { DEMO_SUGGESTION, buildDemoParsed, demoDates };

function boardOption(
  code: string,
  label: string,
  netPrice: number,
  nights: number,
  rateKey: string,
): BoardOption {
  return {
    boardCode: code,
    boardLabel: label,
    rateKey,
    netPrice,
    totalPrice: netPrice * nights,
    currency: "EUR",
    refundable: true,
    available: true,
  };
}

export function buildDemoFlights(): Flight[] {
  const { arrivalDate } = demoDates();
  const day = arrivalDate || "";
  return [
    {
      id: "demo-fl-1",
      legId: "demo-leg-1",
      carrier: "IB",
      carrierName: "Iberia",
      price: 124,
      currency: "EUR",
      origin: "MAD",
      destination: "FCO",
      duration: "2h 25m",
      fareClass: "ECONOMY",
      slices: [
        {
          departureDate: day,
          segments: [
            {
              flightNumber: "IB 3220",
              origin: { iata_code: "MAD" },
              destination: { iata_code: "FCO" },
              departureTime: `${day}T07:25:00`,
              arrivalTime: `${day}T09:50:00`,
            },
          ],
        },
      ],
    },
    {
      id: "demo-fl-2",
      legId: "demo-leg-1",
      carrier: "VY",
      carrierName: "Vueling",
      price: 142,
      currency: "EUR",
      origin: "MAD",
      destination: "FCO",
      duration: "2h 25m",
      fareClass: "ECONOMY",
      slices: [
        {
          departureDate: day,
          segments: [
            {
              flightNumber: "VY 6100",
              origin: { iata_code: "MAD" },
              destination: { iata_code: "FCO" },
              departureTime: `${day}T10:15:00`,
              arrivalTime: `${day}T12:40:00`,
            },
          ],
        },
      ],
    },
    {
      id: "demo-fl-3",
      legId: "demo-leg-1",
      carrier: "FR",
      carrierName: "Ryanair",
      price: 68,
      currency: "EUR",
      origin: "MAD",
      destination: "CIA",
      duration: "2h 35m",
      fareClass: "BASIC",
      slices: [
        {
          departureDate: day,
          segments: [
            {
              flightNumber: "FR 5423",
              origin: { iata_code: "MAD" },
              destination: { iata_code: "CIA" },
              departureTime: `${day}T14:50:00`,
              arrivalTime: `${day}T17:25:00`,
            },
          ],
        },
      ],
    },
  ];
}

export function buildDemoHotels(): Hotel[] {
  const { arrivalDate, departureDate } = demoDates();
  const nights = 4;
  const fetchedAt = new Date().toISOString();
  const checkIn = arrivalDate || "";
  const base = {
    legId: "demo-leg-1" as const,
    provider: "own" as const,
    currency: "EUR",
    nights,
    destination: "Roma",
    fetchedAt: fetchedAt || "",
  };

  return [
    {
      ...base,
      id: "demo-ht-1",
      name: "Hotel de Russie",
      stars: 5,
      netPrice: 312,
      address: "Via del Babuino, Roma",
      description:
        "Palacete del s. XIX entre Piazza del Popolo y Plaza de España. Jardín con cipreses y spa con piscina interior.",
      images: ["/onboarding/demo-hotel-1.jpg"],
      imageUrl: "/onboarding/demo-hotel-1.jpg",
      amenities: ["wifi", "breakfast", "pool", "spa"],
      refundable: true,
      cancellationDeadline: checkIn,
      boardCode: "BB",
      boardOptions: [
        boardOption("RO", "Solo alojamiento", 288, nights, "demo-ht-1-ro"),
        boardOption("BB", "Alojamiento y desayuno", 312, nights, "demo-ht-1-bb"),
        boardOption("HB", "Media pensión", 356, nights, "demo-ht-1-hb"),
        boardOption("FB", "Pensión completa", 398, nights, "demo-ht-1-fb"),
      ],
    },
    {
      ...base,
      id: "demo-ht-2",
      name: "JK Place Roma",
      stars: 5,
      netPrice: 285,
      address: "Via di Monte d'Oro, Roma",
      description:
        "Boutique de 30 habitaciones a cinco minutos de Piazza Navona. Terraza con vistas al centro histórico.",
      images: ["/onboarding/demo-hotel-2.jpg"],
      imageUrl: "/onboarding/demo-hotel-2.jpg",
      amenities: ["wifi", "breakfast"],
      refundable: true,
      cancellationDeadline: checkIn,
      boardCode: "BB",
      boardOptions: [
        boardOption("RO", "Solo alojamiento", 262, nights, "demo-ht-2-ro"),
        boardOption("BB", "Alojamiento y desayuno", 285, nights, "demo-ht-2-bb"),
        boardOption("HB", "Media pensión", 330, nights, "demo-ht-2-hb"),
      ],
    },
    {
      ...base,
      id: "demo-ht-3",
      name: "Hotel Vilòn",
      stars: 5,
      netPrice: 268,
      address: "Via dell'Arancio, Roma",
      description:
        "Anexo al Palazzo Borghese, con jardín privado. 18 habitaciones y restaurante de temporada.",
      images: ["/onboarding/demo-hotel-3.jpg"],
      imageUrl: "/onboarding/demo-hotel-3.jpg",
      amenities: ["wifi", "breakfast"],
      refundable: false,
      boardCode: "BB",
      boardOptions: [
        boardOption("BB", "Alojamiento y desayuno", 268, nights, "demo-ht-3-bb"),
        boardOption("HB", "Media pensión", 312, nights, "demo-ht-3-hb"),
      ],
    },
  ];
}

export function buildDemoExperiences(): Experience[] {
  return [
    {
      id: "demo-ex-1",
      legId: "demo-leg-1",
      provider: "demo",
      name: "Museos Vaticanos y Capilla Sixtina",
      price: 84,
      currency: "EUR",
    },
    {
      id: "demo-ex-2",
      legId: "demo-leg-1",
      provider: "demo",
      name: "Cena y paseo por Trastevere",
      price: 120,
      currency: "EUR",
    },
  ];
}

/**
 * Comparador (Bloque A) en demo: entradas fijas sin llamar a proveedores.
 */
export function buildDemoComparator(_hotelId: string) {
  return [
    {
      provider: "hotelbeds",
      totalPrice: 1248,
      currency: "EUR",
      available: true,
      source: "current" as const,
    },
    {
      provider: "own",
      totalPrice: 1310,
      currency: "EUR",
      available: true,
      source: "current" as const,
    },
    {
      provider: "booking",
      totalPrice: 1512,
      currency: "EUR",
      available: true,
      source: "current" as const,
    },
    {
      provider: "ratehawk",
      totalPrice: null,
      currency: "EUR",
      available: false,
      source: "current" as const,
    },
  ];
}

const DEFAULT_MARGIN = 0.12;

function withMargin(net: number): Pick<QuoteItem, "price" | "markup" | "finalPrice" | "marginPercent"> {
  const markup = Math.round(net * DEFAULT_MARGIN);
  return {
    price: net,
    markup,
    finalPrice: net + markup,
    marginPercent: DEFAULT_MARGIN * 100,
  };
}

export function demoFlightsToQuoteItems(flights: Flight[]): TaggedQuoteItem[] {
  return flights.map((flight, index) => {
    const seg = flight.slices?.[0]?.segments?.[0];
    const dep = seg?.departureTime?.slice(11, 16) ?? "";
    const arr = seg?.arrivalTime?.slice(11, 16) ?? "";
    const priced = withMargin(flight.price ?? 0);
    const origin = flight.origin ?? seg?.origin?.iata_code ?? "MAD";
    const destination =
      flight.destination ?? seg?.destination?.iata_code ?? "FCO";
    const carrier = flight.carrierName ?? flight.carrier ?? "Airline";
    const flightNumber = seg?.flightNumber ?? "";
    return {
      id: flight.id ?? `demo-fl-${index}`,
      legId: flight.legId ?? "demo-leg-1",
      type: "flight" as const,
      title: `${carrier} ${flightNumber} · ${origin} → ${destination}`.trim(),
      provider: carrier,
      source: "mock" as const,
      alternative: index > 0,
      currency: flight.currency ?? "EUR",
      ...priced,
      flightDetails: {
        departureDate: flight.slices?.[0]?.departureDate ?? "",
        departureTime: dep,
        arrivalTime: arr,
        duration: flight.duration ?? "",
        originIata: origin,
        destinationIata: destination,
        originCity: "Madrid",
        destinationCity: "Roma",
        airline: carrier,
        airlineLogoUrl: "",
        flightNumber,
        cabinClass: flight.fareClass ?? "ECONOMY",
        baggageIncluded: index === 2 ? "Sin equipaje" : "1×23kg",
        layovers: [],
        stops: 0,
        priceNumeric: flight.price ?? 0,
        fareName: flight.fareClass ?? "ECONOMY",
      },
    };
  });
}

export function demoHotelsToQuoteItems(hotels: Hotel[]): TaggedQuoteItem[] {
  return hotels.map((hotel, index) => {
    const nights = hotel.nights ?? 4;
    const net = hotel.netPrice ?? 0;
    const stayTotal = net * nights;
    const priced = withMargin(stayTotal);
    const name = hotel.name ?? `Hotel demo ${index + 1}`;
    const destination = hotel.destination ?? "Roma";
    return {
      id: hotel.id ?? `demo-ht-${index}`,
      legId: hotel.legId ?? "demo-leg-1",
      type: "hotel" as const,
      title: `${name} · ${hotel.stars ?? 4}★ · ${destination}`,
      provider: "Inventario demo",
      source: "mock" as const,
      alternative: index > 0,
      currency: hotel.currency ?? "EUR",
      description: hotel.description ?? "",
      imageUrl: hotel.imageUrl ?? "",
      ...priced,
      hotelDetails: {
        provider: "hotelbeds",
        netPrice: net,
        currency: hotel.currency ?? "EUR",
        fetchedAt: hotel.fetchedAt ?? new Date().toISOString(),
        boardCode: hotel.boardCode ?? "BB",
        boardOptions: hotel.boardOptions ?? [],
      },
    };
  });
}

export function demoExperiencesToQuoteItems(
  experiences: Experience[],
): TaggedQuoteItem[] {
  return experiences.map((exp, index) => {
    const priced = withMargin(exp.price ?? 0);
    return {
      id: exp.id ?? `demo-ex-${index}`,
      legId: exp.legId ?? "demo-leg-1",
      type: "experience" as const,
      title: exp.name ?? `Experiencia demo ${index + 1}`,
      provider: exp.provider ?? "demo",
      source: "mock" as const,
      alternative: false,
      currency: exp.currency ?? "EUR",
      ...priced,
      experienceDetails: {
        imageUrl:
          index === 0
            ? "/onboarding/demo-exp-1.jpg"
            : "/onboarding/demo-exp-2.jpg",
      },
    };
  });
}

/** Suggestion text used to auto-start the guided first quote. */
// DEMO_SUGGESTION re-exported from constants.ts (client-safe)
