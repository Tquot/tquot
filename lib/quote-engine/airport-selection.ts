import type { AirportFlightChoices } from "@/lib/quotes/build-quote";
import type { ParsedTripInput } from "@/lib/quotes/build-quote";
import type { EnrichedTripRequest } from "@/lib/parser/airport-resolution";

export type AirportChoice = string | "all";

export type AirportChoicesState = {
  origin: AirportChoice | null;
  destination: AirportChoice | null;
};

export function needsAirportSelection(enriched: EnrichedTripRequest): boolean {
  return (
    enriched._resolved.origin?.needsAgentChoice === true ||
    enriched._resolved.destination?.needsAgentChoice === true
  );
}

export function needsAirportSelectionForParsed(parsed: ParsedTripInput): boolean {
  if (!parsed.includeFlights) return false;
  const enriched = parsed.enrichedTrip;
  if (!enriched) return false;
  return needsAirportSelection(enriched);
}

export function isAirportSelectionComplete(
  enriched: EnrichedTripRequest,
  choices: AirportChoicesState,
): boolean {
  if (
    enriched._resolved.origin?.needsAgentChoice === true &&
    choices.origin === null
  ) {
    return false;
  }
  if (
    enriched._resolved.destination?.needsAgentChoice === true &&
    choices.destination === null
  ) {
    return false;
  }
  return true;
}

export function airportChoicesForBuild(
  enriched: EnrichedTripRequest,
  choices: AirportChoicesState,
): AirportFlightChoices {
  return {
    origin:
      choices.origin ??
      enriched._resolved.origin?.selectedIata ??
      enriched._resolved.origin?.airports[0]?.iata ??
      "all",
    destination:
      choices.destination ??
      enriched._resolved.destination?.selectedIata ??
      enriched._resolved.destination?.airports[0]?.iata ??
      "all",
  };
}
