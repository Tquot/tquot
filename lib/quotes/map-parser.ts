import type { TripRequest } from "@/lib/parser/schema";
import type { HotelLevel, ParsedTripInput } from "./build-quote";

const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

export function addDaysIso(isoDate: string, days: number): string {
  const next = new Date(`${isoDate}T12:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function normalizeMonthKey(month: string): string {
  return month
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function inferYearFromText(text: string): number | null {
  const match = text.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

/** European D/M/Y → YYYY-MM-DD */
function toIsoDate(day: number, month: number, year: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDmyToken(token: string): string | null {
  const match = token.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  return toIsoDate(day, month, year);
}

/**
 * Extracts trip start/end as ISO dates (YYYY-MM-DD) from free text.
 * Supports ISO, DD/MM/YYYY ranges, and Spanish "del 1 al 8 de julio".
 */
export function parseDatesFromText(
  text: string,
  referenceYear?: number,
): { start: string; end: string } | null {
  const source = text.trim();
  const defaultYear = referenceYear ?? inferYearFromText(source) ?? new Date().getFullYear();

  const logAndReturn = (result: { start: string; end: string } | null) => {
    if (result) {
      console.log("[map-parser] extracted dates", {
        start: result.start,
        end: result.end,
      });
    } else {
      console.log("[map-parser] extracted dates", null);
    }
    return result;
  };

  const isoMatches = [...source.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map(
    (match) => match[1],
  );

  if (isoMatches.length >= 2) {
    return logAndReturn({ start: isoMatches[0], end: isoMatches[1] });
  }

  const slashRange = source.match(
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*(?:al|a|hasta|hasta el|to|-|–)\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/i,
  );

  if (slashRange) {
    const start = toIsoDate(
      Number(slashRange[1]),
      Number(slashRange[2]),
      Number(slashRange[3]),
    );
    const end = toIsoDate(
      Number(slashRange[4]),
      Number(slashRange[5]),
      Number(slashRange[6]),
    );
    if (start && end) {
      return logAndReturn({ start, end });
    }
  }

  const dmyTokens = [...source.matchAll(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/g)];

  if (dmyTokens.length >= 2) {
    const start = parseDmyToken(dmyTokens[0][1]);
    const end = parseDmyToken(dmyTokens[1][1]);
    if (start && end) {
      return logAndReturn({ start, end });
    }
  }

  if (dmyTokens.length === 1) {
    const start = parseDmyToken(dmyTokens[0][1]);
    if (start) {
      return logAndReturn({ start, end: addDaysIso(start, 3) });
    }
  }

  const spanishRange = source.match(
    /\b(?:del|de)\s*(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+de\s+(20\d{2}))?\b/iu,
  );

  if (spanishRange) {
    const month = SPANISH_MONTHS[normalizeMonthKey(spanishRange[3])];
    const year = spanishRange[4] ? Number(spanishRange[4]) : defaultYear;

    if (month) {
      const start = toIsoDate(Number(spanishRange[1]), month, year);
      const end = toIsoDate(Number(spanishRange[2]), month, year);
      if (start && end) {
        return logAndReturn({ start, end });
      }
    }
  }

  if (isoMatches.length === 1) {
    return logAndReturn({
      start: isoMatches[0],
      end: addDaysIso(isoMatches[0], 3),
    });
  }

  return logAndReturn(null);
}

function hotelCategoryToLevel(stars?: number): HotelLevel {
  if (!stars || stars <= 3) return "budget";
  if (stars === 4) return "standard";
  if (stars === 5) return "luxury";
  return "premium";
}

function inferDirectFlights(specialRequests?: string): boolean {
  if (!specialRequests) return false;
  return /\b(?:directo|direct|sin escala|non-?stop)\b/i.test(specialRequests);
}

function normalizeTripDate(value: string | undefined, fallback: string): string {
  if (!value?.trim()) return fallback;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = parseDmyToken(trimmed);
  return dmy ?? fallback;
}

/** Maps parser `TripRequest` to the deterministic quote builder input. */
export function tripRequestToParsedTripInput(
  trip: TripRequest,
  options?: { fallbackOrigin?: string },
): ParsedTripInput | null {
  const destination = trip.destination?.trim();
  if (!destination) return null;

  const today = new Date().toISOString().slice(0, 10);
  const start = normalizeTripDate(trip.departureDate, today);
  const end = normalizeTripDate(trip.returnDate, addDaysIso(start, 3));

  return {
    origin: trip.origin?.trim() || options?.fallbackOrigin || "Madrid",
    destination,
    dates: { start, end },
    passengers: {
      adults: trip.adults ?? 2,
      children: trip.children ?? 0,
    },
    budget: trip.budget,
    preferences: {
      hotelLevel: hotelCategoryToLevel(trip.hotelCategory),
      directFlights: inferDirectFlights(trip.specialRequests),
      accessibility: trip.accessibilityNeeds ?? false,
    },
  };
}

/** Fallback mapper when the parser API is unavailable (local regex extract). */
export function localParseToParsedTripInput(
  parsed: {
    destination: string;
    origin?: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    includeFlights: boolean;
  },
): ParsedTripInput {
  const dates = {
    start: parsed.checkIn,
    end: parsed.checkOut,
  };

  console.log("[map-parser] localParseToParsedTripInput dates", dates);

  return {
    origin: parsed.origin?.trim() || "Madrid",
    destination: parsed.destination,
    dates,
    passengers: { adults: parsed.adults, children: 0 },
    preferences: {
      hotelLevel: "standard",
      directFlights: parsed.includeFlights,
      accessibility: false,
    },
  };
}
