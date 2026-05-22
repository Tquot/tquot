import type { FlightOption } from "@/app/api/search-flights/route";
import { getCityIATA } from "@/lib/airports";

export const DUFFEL_OFFER_REQUESTS_URL =
  "https://api.duffel.com/air/offer_requests";
export const DUFFEL_API_VERSION = "v2";

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

function mapOfferToFlightOption(offer: Record<string, unknown>): FlightOption {
  const slice = asRecord(asArray(offer.slices)[0]);
  const segments = asArray(slice.segments).map(asRecord);
  const firstSegment = segments[0] ?? {};
  const lastSegment = segments[segments.length - 1] ?? firstSegment;
  const operatingCarrier = asRecord(firstSegment.operating_carrier);
  const marketingCarrier = asRecord(firstSegment.marketing_carrier);
  const owner = asRecord(offer.owner);
  const stops = Math.max(0, segments.length - 1);

  let stopoverLocation = "Direct";
  if (stops > 0) {
    const stopovers = segments.slice(0, -1).map((segment) => {
      const destination = asRecord(segment.destination);
      return getString(destination.city_name, destination.name, destination.iata_code);
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

  return {
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
  };
}

export async function requestDuffelOfferSearch(
  apiKey: string,
  params: DuffelSearchParams,
) {
  const origin = getCityIATA(params.origin.trim()).toUpperCase();
  const destination = getCityIATA(params.destination.trim()).toUpperCase();

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
        passengers: Array.from({ length: params.adults }, () => ({
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
  };
}

export function countDuffelFlights(payload: unknown): number {
  const data = asRecord(asRecord(payload).data);
  return asArray(data.offers).length;
}

export function normalizeDuffelFlights(payload: unknown): FlightOption[] {
  const data = asRecord(asRecord(payload).data);
  const offers = asArray(data.offers)
    .map(asRecord)
    .sort(
      (left, right) =>
        Number(left.total_amount ?? Number.POSITIVE_INFINITY) -
        Number(right.total_amount ?? Number.POSITIVE_INFINITY),
    )
    .slice(0, 3);

  return offers.map(mapOfferToFlightOption);
}

export function parseDuffelPayload(bodyText: string): unknown {
  return bodyText ? JSON.parse(bodyText) : {};
}
