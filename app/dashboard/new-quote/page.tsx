"use client";

import Link from "next/link";
import { useState } from "react";

type FlightOption = {
  price: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number | string;
  stopoverLocation: string;
};

type HotelOption = {
  name: string;
  pricePerNight: string;
  stars: number | string;
  rating: number | string;
  address: string;
};

type ExtractedRequest = {
  origin: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
};

type SearchResults = {
  flights: FlightOption[];
  hotels: HotelOption[];
};

const DEFAULT_SEARCH: ExtractedRequest = {
  origin: "MAD",
  destination: "BCN",
  checkIn: new Date().toISOString().slice(0, 10),
  checkOut: addDays(new Date(), 3),
  adults: 2,
};

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function toIsoDate(value: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}

function matchKeyword(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/[,.]$/, "");
    }
  }

  return "";
}

function extractRequest(text: string): ExtractedRequest {
  const origin =
    matchKeyword(text, [
      /\bfrom\s+([a-zA-Z]{3}|[a-zA-Z\s]+?)\s+\bto\b/i,
      /\bde\s+([a-zA-Z]{3}|[a-zA-Z\s]+?)\s+\ba\b/i,
      /\borigin(?:e)?[:\s]+([a-zA-Z]{3}|[a-zA-Z\s]+)/i,
      /\borigen[:\s]+([a-zA-Z]{3}|[a-zA-Z\s]+)/i,
    ]) || DEFAULT_SEARCH.origin;

  const destination =
    matchKeyword(text, [
      /\bto\s+([a-zA-Z]{3}|[a-zA-Z\s]+?)(?:\s+(?:from|on|for|with|del|from|check|adults|adultos)|[,.]|$)/i,
      /\ba\s+([a-zA-Z]{3}|[a-zA-Z\s]+?)(?:\s+(?:del|al|con|para|adultos|personas)|[,.]|$)/i,
      /\bdestination[:\s]+([a-zA-Z]{3}|[a-zA-Z\s]+)/i,
      /\bdestino[:\s]+([a-zA-Z]{3}|[a-zA-Z\s]+)/i,
    ]) || DEFAULT_SEARCH.destination;

  const dates = Array.from(
    text.matchAll(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/g),
    (match) => toIsoDate(match[1]),
  ).filter(Boolean);

  const adultsMatch = text.match(
    /\b(\d+)\s*(?:adults?|adultos?|people|personas?|pax|travellers?|viajeros?)\b/i,
  );
  const adults = adultsMatch ? Number(adultsMatch[1]) : DEFAULT_SEARCH.adults;
  const checkIn = dates[0] || DEFAULT_SEARCH.checkIn;
  const checkOut = dates[1] || addDays(new Date(checkIn), 3);

  return {
    origin,
    destination,
    checkIn,
    checkOut,
    adults: Number.isInteger(adults) && adults > 0 ? adults : DEFAULT_SEARCH.adults,
  };
}

async function fetchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Search failed.");
  }

  return data as T;
}

export default function NewQuotePage() {
  const [request, setRequest] = useState("");
  const [extracted, setExtracted] = useState<ExtractedRequest | null>(null);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setResults(null);
    setIsLoading(true);

    const parsed = extractRequest(request);
    setExtracted(parsed);

    try {
      const [flightData, hotelData] = await Promise.all([
        fetchJson<{ flights: FlightOption[] }>("/api/search-flights", {
          origin: parsed.origin,
          destination: parsed.destination,
          date: parsed.checkIn,
          adults: parsed.adults,
        }),
        fetchJson<{ hotels: HotelOption[] }>("/api/search-hotels", {
          destination: parsed.destination,
          checkIn: parsed.checkIn,
          checkOut: parsed.checkOut,
          adults: parsed.adults,
        }),
      ]);

      setResults({
        flights: flightData.flights.slice(0, 3),
        hotels: hotelData.hotels.slice(0, 3),
      });
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Could not search flights and hotels.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#03080F] px-6 py-10 text-[#E8EEF7]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(0,201,167,0.12),transparent)]"
        aria-hidden
      />

      <main className="relative mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center text-sm text-[#8B9CB3] transition-colors hover:text-[#00C9A7]"
        >
          ← Back to dashboard
        </Link>

        <section className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            New quote
          </h1>
          <p className="mt-2 text-[#8B9CB3]">
            Paste a client request and TQuot will search real flights and hotels.
          </p>
        </section>

        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
          <label
            htmlFor="client-request"
            className="mb-3 block text-sm font-medium text-[#E8EEF7]"
          >
            Client request
          </label>
          <textarea
            id="client-request"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder="Example: 2 adults from MAD to BCN, 2026-06-15 to 2026-06-18, 4-star hotel..."
            rows={9}
            className="w-full resize-y rounded-xl border border-white/10 bg-[#03080F]/60 px-4 py-3 text-[#E8EEF7] placeholder:text-[#8B9CB3]/50 outline-none transition-colors focus:border-[#00C9A7]/50 focus:ring-2 focus:ring-[#00C9A7]/20"
          />

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!request.trim() || isLoading}
              className="rounded-xl bg-[#00C9A7] px-8 py-3 text-sm font-semibold text-[#03080F] shadow-[0_0_32px_-8px_rgba(0,201,167,0.5)] transition-all hover:bg-[#00E5BB] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate quote
            </button>
          </div>
        </section>

        {isLoading ? (
          <div className="mt-8 rounded-2xl border border-[#00C9A7]/20 bg-[#00C9A7]/10 px-6 py-5 text-[#00C9A7]">
            🔍 Buscando vuelos y hoteles reales...
          </div>
        ) : null}

        {error ? (
          <div className="mt-8 rounded-2xl border border-[#FF6B35]/30 bg-[#FF6B35]/10 px-6 py-5 text-[#FF6B35]">
            {error}
          </div>
        ) : null}

        {extracted && !isLoading ? (
          <section className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-[#8B9CB3]">
            <span className="text-white">Detected:</span> {extracted.origin} →{" "}
            {extracted.destination}, {extracted.checkIn} to {extracted.checkOut},{" "}
            {extracted.adults} adults
          </section>
        ) : null}

        {results ? (
          <section className="mt-10 space-y-8">
            <ResultSection title="Flights">
              {results.flights.length > 0 ? (
                results.flights.map((flight, index) => (
                  <ResultCard key={`${flight.airline}-${index}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="font-semibold text-white">
                          {flight.airline}
                        </p>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-[#8B9CB3]">
                          {flight.flightNumber}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-[#8B9CB3] sm:grid-cols-2">
                        <p>
                          <span className="text-white">Depart:</span>{" "}
                          {flight.departureTime}
                        </p>
                        <p>
                          <span className="text-white">Arrive:</span>{" "}
                          {flight.arrivalTime}
                        </p>
                        <p>
                          <span className="text-white">Duration:</span>{" "}
                          {flight.duration}
                        </p>
                        <p>
                          <span className="text-white">Stops:</span>{" "}
                          {flight.stops}
                        </p>
                      </div>
                      {String(flight.stops) !== "0" ? (
                        <p className="mt-2 text-sm text-[#8B9CB3]">
                          <span className="text-white">Stopover:</span>{" "}
                          {flight.stopoverLocation}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-lg font-bold text-[#00C9A7]">
                      {flight.price}
                    </p>
                  </ResultCard>
                ))
              ) : (
                <EmptyState>No flights found.</EmptyState>
              )}
            </ResultSection>

            <ResultSection title="Hotels">
              {results.hotels.length > 0 ? (
                results.hotels.map((hotel, index) => (
                  <ResultCard key={`${hotel.name}-${index}`}>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{hotel.name}</p>
                      <p className="mt-1 text-sm text-[#8B9CB3]">
                        {hotel.stars} stars · Rating {hotel.rating}
                      </p>
                      <p className="mt-2 text-sm text-[#8B9CB3]">
                        {hotel.address}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-[#00C9A7]">
                      {hotel.pricePerNight}
                    </p>
                  </ResultCard>
                ))
              ) : (
                <EmptyState>No hotels found.</EmptyState>
              )}
            </ResultSection>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                className="rounded-xl bg-[#00C9A7] px-10 py-4 text-sm font-bold text-[#03080F] shadow-[0_0_40px_-8px_rgba(0,201,167,0.55)] transition-all hover:scale-[1.02] hover:bg-[#00E5BB]"
              >
                Generate PDF quote
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm sm:flex-row sm:items-start">
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-[#8B9CB3]">
      {children}
    </div>
  );
}
