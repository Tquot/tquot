import type {
  FlightFareOption,
  FlightLayover,
  FlightOption,
} from "@/app/api/search-flights/route";
import { getCityIATA } from "@/lib/airports";

export const DUFFEL_OFFER_REQUESTS_URL =
  "https://api.duffel.com/air/offer_requests";
export const DUFFEL_API_VERSION = "v2";
/** Duffel offer_requests allow at most 9 passengers per search. */
export const DUFFEL_MAX_PASSENGERS = 9;

export type DuffelLocale = "es" | "en";

const CABIN_CLASS_LABELS: Record<
  string,
  Record<DuffelLocale, string>
> = {
  economy: { es: "Turista", en: "Economy" },
  premium_economy: { es: "Turista Premium", en: "Premium Economy" },
  business: { es: "Business", en: "Business" },
  first: { es: "Primera clase", en: "First Class" },
};

export type DuffelSearchParams = {
  origin: string;
  destination: string;
  date: string;
  adults: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return "Unknown";
}

function formatIsoDuration(iso: unknown) {
  if (typeof iso !== "string" || !iso.trim()) {
    return "Unknown";
  }

  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) {
    return iso;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown";
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return value;
}

function formatDepartureDate(iso: unknown): { display: string; isoDate: string } {
  if (typeof iso !== "string" || !iso.trim()) {
    return { display: "", isoDate: "" };
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { display: "", isoDate: "" };
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return {
    display: `${day}/${month}/${year}`,
    isoDate: `${year}-${month}-${day}`,
  };
}

function parseOfferPrice(amount: unknown): number {
  const parsed = Number.parseFloat(String(amount ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function normalizeCabinSlug(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function formatBaggageIncluded(
  passengers: unknown,
  locale: DuffelLocale = "es",
): string {
  const passengerList = asArray(passengers);
  const firstPassenger = asRecord(passengerList[0]);
  const baggages = asArray(firstPassenger.baggages);
  const noneLabel =
    locale === "en" ? "No baggage included" : "Sin equipaje incluido";

  if (baggages.length === 0) {
    return noneLabel;
  }

  const labels: string[] = [];

  for (const entry of baggages) {
    const baggage = asRecord(entry);
    const quantity = Number(baggage.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const type = String(baggage.type ?? "");
    if (type === "carry_on") {
      labels.push(
        locale === "en"
          ? `${quantity} carry-on bag${quantity === 1 ? "" : "s"}`
          : `${quantity} maleta${quantity === 1 ? "" : "s"} de mano`,
      );
    } else if (type === "checked") {
      labels.push(
        locale === "en"
          ? `${quantity} checked bag${quantity === 1 ? "" : "s"}`
          : `${quantity} facturada${quantity === 1 ? "" : "s"}`,
      );
    }
  }

  return labels.length > 0 ? labels.join(" · ") : noneLabel;
}

function formatCabinClass(
  passengers: unknown,
  locale: DuffelLocale = "es",
): string {
  const passengerList = asArray(passengers);
  const firstPassenger = asRecord(passengerList[0]);
  const slug = normalizeCabinSlug(firstPassenger.cabin_class);
  const mapped = slug ? CABIN_CLASS_LABELS[slug] : undefined;

  if (mapped) {
    return mapped[locale];
  }

  const marketingName = getString(firstPassenger.cabin_class_marketing_name);
  if (marketingName !== "Unknown") {
    return marketingName;
  }

  if (slug && slug !== "unknown") {
    return slug;
  }

  return "Unknown";
}

function layoverFromStop(stop: Record<string, unknown>): FlightLayover {
  const airport = asRecord(stop.airport);
  return {
    airport: getString(airport.city_name, airport.name),
    iata: getString(airport.iata_code),
    duration: formatIsoDuration(stop.duration),
  };
}

function layoverDurationBetween(arrivingAt: unknown, departingAt: unknown): string {
  if (typeof arrivingAt !== "string" || typeof departingAt !== "string") {
    return "Unknown";
  }

  const arrivalMs = Date.parse(arrivingAt);
  const departureMs = Date.parse(departingAt);
  if (Number.isNaN(arrivalMs) || Number.isNaN(departureMs) || departureMs <= arrivalMs) {
    return "Unknown";
  }

  const totalMinutes = Math.round((departureMs - arrivalMs) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function collectLayovers(segments: Record<string, unknown>[]): FlightLayover[] {
  const layovers: FlightLayover[] = [];

  for (const segment of segments) {
    for (const stop of asArray(segment.stops)) {
      layovers.push(layoverFromStop(asRecord(stop)));
    }
  }

  if (layovers.length > 0 || segments.length <= 1) {
    return layovers;
  }

  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index];
    const next = segments[index + 1];
    const destination = asRecord(current.destination);

    layovers.push({
      airport: getString(destination.city_name, destination.name),
      iata: getString(destination.iata_code),
      duration: layoverDurationBetween(current.arriving_at, next.departing_at),
    });
  }

  return layovers;
}

function fareNameFromOffer(
  offer: Record<string, unknown>,
  locale: DuffelLocale,
): string {
  const slice = asRecord(asArray(offer.slices)[0]);
  const segments = asArray(slice.segments).map(asRecord);
  const firstSegment = segments[0] ?? {};
  const cabinClass = formatCabinClass(firstSegment.passengers, locale);
  if (cabinClass !== "Unknown") {
    return cabinClass;
  }
  const fallbackFare = locale === "en" ? "Fare" : "Tarifa";
  return getString(offer.fare_brand_name, offer.owner_name, fallbackFare);
}

function offerToFareOption(
  offer: Record<string, unknown>,
  locale: DuffelLocale,
): FlightFareOption {
  const slice = asRecord(asArray(offer.slices)[0]);
  const segments = asArray(slice.segments).map(asRecord);
  const firstSegment = segments[0] ?? {};
  const priceNumeric = parseOfferPrice(offer.total_amount);

  return {
    fareName: fareNameFromOffer(offer, locale),
    price: `${getString(offer.total_currency)} ${getString(offer.total_amount)}`,
    priceNumeric,
    baggageIncluded: formatBaggageIncluded(firstSegment.passengers, locale),
    cabinClass: formatCabinClass(firstSegment.passengers, locale),
    offerId:
      typeof offer.id === "string" && offer.id.trim()
        ? offer.id.trim()
        : "",
  };
}

function flightGroupKey(option: FlightOption): string {
  return [
    option.airline,
    option.flightNumber,
    option.departureTime,
    option.arrivalTime,
  ].join("|");
}

function mapOfferToFlightOption(
  offer: Record<string, unknown>,
  locale: DuffelLocale,
): FlightOption {
  const slice = asRecord(asArray(offer.slices)[0]);
  const segments = asArray(slice.segments).map(asRecord);
  const firstSegment = segments[0] ?? {};
  const lastSegment = segments[segments.length - 1] ?? firstSegment;
  const operatingCarrier = asRecord(firstSegment.operating_carrier);
  const marketingCarrier = asRecord(firstSegment.marketing_carrier);
  const owner = asRecord(offer.owner);
  const origin = asRecord(firstSegment.origin);
  const destination = asRecord(lastSegment.destination);
  const stops = Math.max(0, segments.length - 1);
  const { display: departureDate, isoDate: departureDateISO } = formatDepartureDate(
    firstSegment.departing_at,
  );

  let stopoverLocation = "Direct";
  if (stops > 0) {
    const stopovers = segments.slice(0, -1).map((segment) => {
      const segmentDestination = asRecord(segment.destination);
      return getString(
        segmentDestination.city_name,
        segmentDestination.name,
        segmentDestination.iata_code,
      );
    });
    stopoverLocation =
      stopovers.filter((stopover) => stopover !== "Unknown").join(", ") || "Unknown";
  }

  const carrierCode = getString(
    marketingCarrier.iata_code,
    operatingCarrier.iata_code,
    owner.iata_code,
  );
  const flightNumber = getString(
    firstSegment.marketing_carrier_flight_number,
    firstSegment.operating_carrier_flight_number,
  );
  const priceNumeric = parseOfferPrice(offer.total_amount);
  const fareName = fareNameFromOffer(offer, locale);

  return {
    offerId: getString(offer.id) !== "Unknown" ? getString(offer.id) : undefined,
    fareName,
    price: `${getString(offer.total_currency)} ${getString(offer.total_amount)}`,
    airline: getString(operatingCarrier.name, owner.name, marketingCarrier.name),
    flightNumber:
      carrierCode === "Unknown"
        ? flightNumber
        : flightNumber === "Unknown"
          ? carrierCode
          : `${carrierCode} ${flightNumber}`,
    departureTime: formatTime(firstSegment.departing_at),
    arrivalTime: formatTime(lastSegment.arriving_at),
    duration: formatIsoDuration(slice.duration),
    stops,
    stopoverLocation,
    departureDate,
    departureDateISO,
    originIata: getString(origin.iata_code),
    destinationIata: getString(destination.iata_code),
    originCity: getString(origin.city_name, origin.name),
    destinationCity: getString(destination.city_name, destination.name),
    airlineLogoUrl: getString(operatingCarrier.logo_symbol_url),
    cabinClass: formatCabinClass(firstSegment.passengers, locale),
    baggageIncluded: formatBaggageIncluded(firstSegment.passengers, locale),
    layovers: collectLayovers(segments),
    priceNumeric,
  };
}

function compareFlightOptions(left: FlightOption, right: FlightOption): number {
  const leftDirect = Number(left.stops) === 0 ? 0 : 1;
  const rightDirect = Number(right.stops) === 0 ? 0 : 1;

  if (leftDirect !== rightDirect) {
    return leftDirect - rightDirect;
  }

  return left.priceNumeric - right.priceNumeric;
}

export function capDuffelAdults(adults: number): number {
  if (!Number.isFinite(adults) || adults < 1) return 1;
  return Math.min(Math.floor(adults), DUFFEL_MAX_PASSENGERS);
}

function currencyFromPriceLabel(price: string, fallback = "EUR"): string {
  const token = price.trim().split(/\s+/)[0];
  return token && /^[A-Z]{3}$/i.test(token) ? token.toUpperCase() : fallback;
}

/**
 * When the agent requested more adults than Duffel allows, scale offer totals
 * pro-rata from the capped search (searchAdults = min(requested, 9)).
 */
export function scaleFlightsForRequestedAdults(
  flights: FlightOption[],
  requestedAdults: number,
): FlightOption[] {
  const searchAdults = capDuffelAdults(requestedAdults);
  if (requestedAdults <= searchAdults) return flights;

  const scale = requestedAdults / searchAdults;
  const note = `Precio estimado para ${requestedAdults} pasajeros (Duffel máx. ${DUFFEL_MAX_PASSENGERS} por búsqueda)`;

  return flights.map((flight) => {
    const currency = currencyFromPriceLabel(flight.price);
    const priceNumeric = Math.round(flight.priceNumeric * scale);
    return {
      ...flight,
      priceNumeric,
      price: `${currency} ${priceNumeric}`,
      groupPriceNote: note,
      fareOptions: flight.fareOptions?.map((fare) => {
        const fareCurrency = currencyFromPriceLabel(fare.price, currency);
        const farePriceNumeric = Math.round(fare.priceNumeric * scale);
        return {
          ...fare,
          priceNumeric: farePriceNumeric,
          price: `${fareCurrency} ${farePriceNumeric}`,
        };
      }),
    };
  });
}

export async function requestDuffelOfferSearch(
  apiKey: string,
  params: DuffelSearchParams,
) {
  const origin = getCityIATA(params.origin.trim()).toUpperCase();
  const destination = getCityIATA(params.destination.trim()).toUpperCase();
  const adults = capDuffelAdults(params.adults);

  const response = await fetch(DUFFEL_OFFER_REQUESTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Duffel-Version": DUFFEL_API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        slices: [
          {
            origin,
            destination,
            departure_date: params.date.trim(),
          },
        ],
        passengers: Array.from({ length: adults }, () => ({
          type: "adult",
        })),
        cabin_class: "economy",
      },
    }),
  });

  const bodyText = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    bodyText,
    searchAdults: adults,
    requestedAdults: params.adults,
  };
}

export function countDuffelFlights(payload: unknown): number {
  const data = asRecord(asRecord(payload).data);
  return asArray(data.offers).length;
}

export function normalizeDuffelFlights(
  payload: unknown,
  locale: DuffelLocale = "es",
): FlightOption[] {
  const data = asRecord(asRecord(payload).data);
  const rawOffers = asArray(data.offers).map(asRecord);
  const mapped = rawOffers.map((offer) => mapOfferToFlightOption(offer, locale));

  const groups = new Map<string, { offers: Record<string, unknown>[]; options: FlightOption[] }>();

  for (let index = 0; index < rawOffers.length; index += 1) {
    const option = mapped[index];
    const raw = rawOffers[index];
    if (!option || !raw) continue;

    const key = flightGroupKey(option);
    const existing = groups.get(key);
    if (existing) {
      existing.offers.push(raw);
      existing.options.push(option);
    } else {
      groups.set(key, { offers: [raw], options: [option] });
    }
  }

  const grouped: FlightOption[] = [];
  const groupFareCounts: Array<{
    airline: string;
    flightNumber: string;
    fareOptionsCount: number;
  }> = [];

  for (const { offers, options } of groups.values()) {
    const sorted = options
      .map((option, index) => ({ option, raw: offers[index] }))
      .sort((left, right) => left.option.priceNumeric - right.option.priceNumeric);

    const primaryEntry = sorted[0];
    if (!primaryEntry) continue;

    const primary = primaryEntry.option;
    const alternates = sorted
      .slice(1)
      .map((entry) => offerToFareOption(entry.raw, locale))
      .filter((fare) => fare.offerId.length > 0);

    groupFareCounts.push({
      airline: primary.airline,
      flightNumber: primary.flightNumber,
      fareOptionsCount: alternates.length,
    });

    grouped.push({
      ...primary,
      ...(alternates.length > 0 ? { fareOptions: alternates } : {}),
    });
  }

  console.log("[normalizeDuffelFlights] Total offers from Duffel:", rawOffers.length);
  console.log(
    "[normalizeDuffelFlights] Unique flight groups after grouping:",
    groups.size,
  );
  console.log(
    "[normalizeDuffelFlights] Fare options per group:",
    groupFareCounts,
  );

  return grouped.sort(compareFlightOptions).slice(0, 10);
}

export function parseDuffelPayload(bodyText: string): unknown {
  return bodyText ? JSON.parse(bodyText) : {};
}
