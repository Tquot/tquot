import { NextResponse } from "next/server";
import type { FlightOption } from "@/app/api/search-flights/route";
import {
  DUFFEL_MAX_PASSENGERS,
  normalizeDuffelFlights,
  parseDuffelPayload,
  requestDuffelOfferSearch,
  scaleFlightsForRequestedAdults,
} from "@/lib/duffel/flights";
import { resolveDuffelLocale } from "@/lib/i18n/resolve-duffel-locale";

type SearchFlightsDuffelRequest = {
  origin?: unknown;
  destination?: unknown;
  date?: unknown;
  adults?: unknown;
  locale?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getDuffelErrorMessage(payload: unknown, fallback: string) {
  const response = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const errors = response.errors;

  if (Array.isArray(errors) && errors.length > 0) {
    const messages = errors
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const error = entry as Record<string, unknown>;
        return typeof error.message === "string" ? error.message : null;
      })
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  if (typeof response.message === "string" && response.message.trim()) {
    return response.message;
  }

  return fallback;
}

export async function POST(request: Request) {
  const duffelApiKey = process.env.DUFFEL_API_KEY;

  let body: SearchFlightsDuffelRequest;

  try {
    body = (await request.json()) as SearchFlightsDuffelRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const { origin, destination, date, adults, locale: bodyLocale } = body;
  const locale = resolveDuffelLocale({
    bodyLocale,
    acceptLanguage: request.headers.get("accept-language"),
  });

  if (
    !isNonEmptyString(origin) ||
    !isNonEmptyString(destination) ||
    !isNonEmptyString(date)
  ) {
    return NextResponse.json(
      { error: "origin, destination and date are required." },
      { status: 400 },
    );
  }

  const adultCount = Number(adults ?? 1);

  if (!Number.isInteger(adultCount) || adultCount < 1) {
    return NextResponse.json(
      { error: "adults must be a positive integer." },
      { status: 400 },
    );
  }

  if (!duffelApiKey) {
    console.error("[search-flights-duffel] Missing DUFFEL_API_KEY.");
    return NextResponse.json(
      { error: "Missing DUFFEL_API_KEY environment variable." },
      { status: 500 },
    );
  }

  try {
    const result = await requestDuffelOfferSearch(duffelApiKey, {
      origin,
      destination,
      date,
      adults: adultCount,
    });

    console.log("[search-flights-duffel] Duffel response", {
      status: result.status,
      ok: result.ok,
      locale,
      requestedAdults: adultCount,
      searchAdults: result.searchAdults,
      capped: adultCount > DUFFEL_MAX_PASSENGERS,
      bodyPreview: result.bodyText.slice(0, 500),
    });

    let payload: unknown;

    try {
      payload = parseDuffelPayload(result.bodyText);
    } catch {
      return NextResponse.json(
        { error: "Duffel API returned invalid JSON." },
        { status: 502 },
      );
    }

    if (!result.ok) {
      const message = getDuffelErrorMessage(
        payload,
        result.bodyText || "Failed to search flights with Duffel.",
      );

      console.error("[search-flights-duffel] Duffel API error", {
        status: result.status,
        message,
        payload,
      });

      return NextResponse.json({ error: message }, { status: result.status });
    }

    const normalized: FlightOption[] = normalizeDuffelFlights(payload, locale);
    const flights = scaleFlightsForRequestedAdults(normalized, adultCount);

    if (flights.length === 0) {
      console.error("[search-flights-duffel] Duffel returned no flight options", {
        payload,
      });

      return NextResponse.json(
        { error: "Duffel returned no flight options." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      flights,
      ...(adultCount > DUFFEL_MAX_PASSENGERS
        ? {
            passengerCap: {
              requestedAdults: adultCount,
              searchAdults: result.searchAdults,
              maxPerSearch: DUFFEL_MAX_PASSENGERS,
            },
          }
        : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected Duffel flight search error.";

    console.error("[search-flights-duffel] Request failed", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
