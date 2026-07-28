import type { PdfFlightDetails, QuoteLineItem } from "../types";

type StructuredFlightSource = {
  airline?: string | null;
  airlineName?: string | null;
  airlineLogoUrl?: string | null;
  origin?: string | null;
  destination?: string | null;
  originIata?: string | null;
  destinationIata?: string | null;
  flightNumber?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  duration?: string | null;
  durationMinutes?: number | null;
  stops?: number | null;
  cabinClass?: string | null;
  fareType?: string | null;
  fareName?: string | null;
  baggageIncluded?: string | null;
};

/**
 * Resolve rich flight fields for PDF rendering.
 * Prefers structured flightDetails (snapshot / map-premium-quote), then
 * falls back to parsing description + subtitle text.
 */
export function resolveFlightDetails(
  item: Pick<QuoteLineItem, "description" | "subtitle" | "flightDetails" | "supplier">,
  structured?: StructuredFlightSource | null,
): PdfFlightDetails {
  const fromItem = item.flightDetails ?? null;
  const fromStructured = structured ? mapStructured(structured) : null;
  const fromText = parseFlightText(item.description, item.subtitle);

  return {
    airlineName:
      fromItem?.airlineName ||
      fromStructured?.airlineName ||
      fromText.airlineName ||
      item.supplier ||
      null,
    airlineLogoUrl:
      fromItem?.airlineLogoUrl ||
      fromStructured?.airlineLogoUrl ||
      null,
    originIata:
      fromItem?.originIata ||
      fromStructured?.originIata ||
      fromText.originIata ||
      null,
    destinationIata:
      fromItem?.destinationIata ||
      fromStructured?.destinationIata ||
      fromText.destinationIata ||
      null,
    flightNumber:
      fromItem?.flightNumber ||
      fromStructured?.flightNumber ||
      fromText.flightNumber ||
      null,
    departureDate:
      fromItem?.departureDate ||
      fromStructured?.departureDate ||
      fromText.departureDate ||
      null,
    departureTime:
      fromItem?.departureTime ||
      fromStructured?.departureTime ||
      fromText.departureTime ||
      null,
    arrivalTime:
      fromItem?.arrivalTime ||
      fromStructured?.arrivalTime ||
      fromText.arrivalTime ||
      null,
    duration:
      fromItem?.duration ||
      fromStructured?.duration ||
      formatDurationMinutes(
        fromItem?.durationMinutes ?? fromStructured?.durationMinutes,
      ) ||
      fromText.duration ||
      null,
    durationMinutes:
      fromItem?.durationMinutes ??
      fromStructured?.durationMinutes ??
      null,
    stops:
      fromItem?.stops ??
      fromStructured?.stops ??
      fromText.stops ??
      null,
    cabinClass:
      fromItem?.cabinClass ||
      fromStructured?.cabinClass ||
      fromText.cabinClass ||
      null,
    fareType:
      fromItem?.fareType ||
      fromStructured?.fareType ||
      fromText.fareType ||
      null,
    baggageIncluded:
      fromItem?.baggageIncluded ||
      fromStructured?.baggageIncluded ||
      fromText.baggageIncluded ||
      null,
  };
}

export function formatStopsLabel(stops: number | null | undefined): string {
  if (stops == null) return "—";
  if (stops === 0) return "Directo";
  if (stops === 1) return "1 escala";
  return `${stops} escalas`;
}

export function formatFareLabel(details: PdfFlightDetails): string {
  const parts: string[] = [];
  if (details.fareType) parts.push(details.fareType);
  if (details.baggageIncluded) {
    const baggage = details.baggageIncluded.toLowerCase();
    if (
      baggage.includes("sin equipaje") ||
      baggage.includes("no bag") ||
      baggage === "none" ||
      baggage === "0"
    ) {
      parts.push("Sin equipaje");
    } else if (!parts.some((part) => /equipaje|bag/i.test(part))) {
      parts.push(details.baggageIncluded);
    }
  }
  return parts.filter(Boolean).join(" · ") || "—";
}

function mapStructured(source: StructuredFlightSource): PdfFlightDetails {
  return {
    airlineName: source.airlineName ?? source.airline ?? null,
    airlineLogoUrl: source.airlineLogoUrl ?? null,
    originIata: source.originIata ?? source.origin ?? null,
    destinationIata: source.destinationIata ?? source.destination ?? null,
    flightNumber: source.flightNumber ?? null,
    departureDate: source.departureDate ?? null,
    departureTime: source.departureTime ?? null,
    arrivalTime: source.arrivalTime ?? null,
    duration:
      source.duration ?? formatDurationMinutes(source.durationMinutes) ?? null,
    durationMinutes: source.durationMinutes ?? null,
    stops: source.stops ?? null,
    cabinClass: source.cabinClass ?? null,
    fareType: source.fareType ?? source.fareName ?? null,
    baggageIncluded: source.baggageIncluded ?? null,
  };
}

function parseFlightText(
  description: string,
  subtitle?: string | null,
): PdfFlightDetails {
  const blob = [description, subtitle].filter(Boolean).join(" · ");

  const iataMatch =
    blob.match(/\b([A-Z]{3})\s*(?:→|->|–|—|-)\s*([A-Z]{3})\b/) ??
    blob.match(/\(([A-Z]{3})\)\s*(?:→|->|–|—|-)\s*[^(]*\(([A-Z]{3})\)/);

  const flightNumberMatch = blob.match(/\b([A-Z0-9]{2})\s?(\d{2,4})\b/i);
  const flightNumber = flightNumberMatch
    ? `${flightNumberMatch[1].toUpperCase()}${flightNumberMatch[2]}`
    : null;

  let stops: number | null = null;
  if (/directo|sin escala|non[-\s]?stop/i.test(blob)) stops = 0;
  else {
    const stopsMatch = blob.match(/(\d+)\s*escalas?/i);
    if (stopsMatch) stops = Number(stopsMatch[1]);
  }

  const timeMatches = [...blob.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map(
    (match) => match[0],
  );

  const durationMatch =
    blob.match(/\b(\d{1,2})\s*h(?:oras?)?(?:\s*(\d{1,2})\s*m(?:in)?)?\b/i) ??
    blob.match(/\b(\d{1,2}):([0-5]\d)\s*h\b/i);

  let duration: string | null = null;
  if (durationMatch) {
    if (durationMatch[2] && durationMatch[0].includes(":")) {
      duration = `${Number(durationMatch[1])}h ${durationMatch[2]}m`;
    } else {
      const hours = durationMatch[1];
      const mins = durationMatch[2];
      duration = mins ? `${hours}h ${mins}m` : `${hours}h`;
    }
  }

  const cabinMatch = blob.match(
    /\b(turista|economy|premium economy|business|primera|first|cabin[ea]?)\b/i,
  );

  let fareType: string | null = null;
  let baggageIncluded: string | null = null;
  if (/equipaje|baggage|bag\b/i.test(blob)) {
    const bagMatch = blob.match(
      /([^·|]*equipaje[^·|]*)/i,
    ) ?? blob.match(/([^·|]*bag(?:gage)?[^·|]*)/i);
    baggageIncluded = bagMatch?.[1]?.trim() ?? null;
    fareType = /sin equipaje|no bag|light|basic/i.test(blob)
      ? "Sin equipaje"
      : "Con equipaje";
  }

  let airlineName: string | null = null;
  const titleAirline = description.split(/[·|,]/)[0]?.trim();
  if (titleAirline) {
    airlineName = titleAirline
      .replace(/\b[A-Z0-9]{2}\s?\d{2,4}\b/i, "")
      .replace(/\bVuelo\b/i, "")
      .replace(/\b([A-Z]{3})\s*(?:→|->|–|—|-)\s*([A-Z]{3})\b/, "")
      .trim();
    if (airlineName.length < 2) airlineName = null;
  }

  return {
    airlineName,
    originIata: iataMatch?.[1] ?? null,
    destinationIata: iataMatch?.[2] ?? null,
    flightNumber,
    departureTime: timeMatches[0] ?? null,
    arrivalTime: timeMatches[1] ?? null,
    duration,
    stops,
    cabinClass: cabinMatch?.[1] ?? null,
    fareType,
    baggageIncluded,
  };
}

function formatDurationMinutes(
  minutes: number | null | undefined,
): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}
