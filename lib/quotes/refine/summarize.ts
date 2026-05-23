import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import { itemsForPricing } from "@/lib/quotes/build-quote";

function summarizeItems(items: ReturnType<typeof itemsForPricing>) {
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    price: item.price,
    source: item.source,
    stops: item.flightDetails?.stops,
  }));
}

export function summarizeQuoteForRefine(quote: Quote) {
  return {
    id: quote.id,
    route: quote.summary.route,
    durationDays: quote.summary.durationDays,
    passengers: quote.summary.passengers,
    pricing: quote.pricing,
    meta: quote._meta,
    selectedFlights: summarizeItems(itemsForPricing(quote.flights)),
    selectedHotels: summarizeItems(itemsForPricing(quote.hotels)),
    selectedExperiences: summarizeItems(itemsForPricing(quote.experiences)),
    flightOptionsCount: quote.flights.length,
    hotelOptionsCount: quote.hotels.length,
    experienceOptionsCount: quote.experiences.length,
  };
}

export function summarizeTripInputForRefine(tripInput: ParsedTripInput) {
  return {
    origin: tripInput.origin,
    destination: tripInput.destination,
    dates: tripInput.dates,
    passengers: tripInput.passengers,
    preferences: tripInput.preferences,
    budget: tripInput.budget,
  };
}

export function buildRefineUserMessage(
  message: string,
  quote: Quote,
  tripInput: ParsedTripInput,
) {
  return JSON.stringify(
    {
      agentMessage: message,
      trip: summarizeTripInputForRefine(tripInput),
      quote: summarizeQuoteForRefine(quote),
    },
    null,
    2,
  );
}
