"use server";

import Anthropic from "@anthropic-ai/sdk";
import { quoteItemToFlight, quoteItemToHotel } from "@/lib/booking-handoff/item-adapters";
import {
  parseHotelContextFromTitle,
  parseHotelNightsFromTitle,
} from "@/lib/hotels/parse-hotel-title";
import type { Quote } from "@/lib/quote-engine/types";
import { itemsForPricing } from "@/lib/quotes/build-quote";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ITINERARY_MODEL, SYSTEM_PROMPT } from "./prompts";
import { ItinerarySchema, type Itinerary } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface GenerateInput {
  quoteId: string;
  force?: boolean;
}

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function generateItinerary(
  input: GenerateInput,
): Promise<Itinerary | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("snapshot, departure_date, return_date, destination, origin")
    .eq("id", input.quoteId)
    .single();

  if (error || !data?.snapshot) return null;

  const quote = data.snapshot as Quote;

  if (quote.itinerary && !input.force) {
    return quote.itinerary;
  }

  const promptContext = buildContext(quote, {
    departureDate: String(data.departure_date),
    returnDate: String(data.return_date),
    destination: data.destination,
    origin: data.origin,
  });

  try {
    const response = await client.messages.create({
      model: ITINERARY_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: promptContext }],
    });

    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") return null;

    const cleaned = text.text
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { days?: unknown[] };
    const validated = ItinerarySchema.safeParse({
      ...parsed,
      generatedAt: new Date().toISOString(),
      model: ITINERARY_MODEL,
    });

    if (!validated.success) {
      console.error(
        "[itinerary] schema validation failed:",
        validated.error.flatten(),
      );
      return null;
    }

    quote.itinerary = validated.data;
    await supabase
      .from("quotes")
      .update({
        snapshot: quote,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.quoteId);

    return validated.data;
  } catch (err) {
    console.error("[itinerary] generation failed:", err);
    return null;
  }
}

function buildContext(
  quote: Quote,
  meta: {
    departureDate: string;
    returnDate: string;
    destination: string;
    origin: string;
  },
): string {
  let cursorDate = meta.departureDate;

  const hotels = itemsForPricing(quote.hotels)
    .map((item) => {
      const mapped = quoteItemToHotel(item);
      const ctx = parseHotelContextFromTitle(item.title);
      const nights =
        mapped?.nights ?? parseHotelNightsFromTitle(item.title) ?? 1;
      const checkIn = cursorDate;
      const checkOut = addDaysIso(checkIn, nights);
      cursorDate = checkOut;
      const name = mapped?.name ?? ctx.name ?? item.title;
      const destination = ctx.location ?? meta.destination;
      return `Hotel "${name}" en ${destination} del ${checkIn} al ${checkOut} (${nights} noches)`;
    })
    .join("\n  ");

  const flights = itemsForPricing(quote.flights)
    .map((item) => {
      const mapped = quoteItemToFlight(item);
      const fd = item.flightDetails;
      const carrier = mapped?.carrierName ?? mapped?.carrier ?? item.provider;
      const origin = mapped?.origin ?? fd?.originIata ?? meta.origin;
      const destination =
        mapped?.destination ?? fd?.destinationIata ?? meta.destination;
      const date = fd?.departureDate ?? meta.departureDate;
      return `Vuelo ${carrier} ${origin} → ${destination} el ${date}`;
    })
    .join("\n  ");

  const experiences = itemsForPricing(quote.experiences)
    .map((item) => {
      const destination = meta.destination;
      return `Experiencia: "${item.title}" en ${destination}`;
    })
    .join("\n  ");

  const transfers = itemsForPricing(quote.transfers)
    .map((item) => {
      const td = item.transferDetails;
      const label =
        td?.pickupLocation && td?.dropoffLocation
          ? `${td.pickupLocation} → ${td.dropoffLocation}`
          : item.title;
      return `Traslado: ${label} en ${meta.destination}`;
    })
    .join("\n  ");

  return [
    "Genera el itinerario día a día para la siguiente cotización:",
    "",
    "Hoteles:",
    `  ${hotels || "(ninguno)"}`,
    "",
    "Vuelos:",
    `  ${flights || "(ninguno)"}`,
    "",
    "Experiencias:",
    `  ${experiences || "(ninguna)"}`,
    "",
    "Traslados:",
    `  ${transfers || "(ninguno)"}`,
    "",
    "Devuelve JSON con la estructura: { days: [{ date, dayNumber, title, narrative, legId?, highlights }] }.",
    "Un objeto día por cada fecha desde el primer check-in hasta el último check-out (inclusive del día de salida).",
  ].join("\n");
}
