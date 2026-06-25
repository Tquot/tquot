import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  NARRATOR_MODEL,
  SYSTEM_OPENING,
  SYSTEM_SUMMARY,
  SYSTEM_REFINEMENT_PLAN,
} from "./prompts";
import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import { toParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import type { BuildEvent, RefinementIntent } from "@/lib/quote-conversation/types";

interface StreamCallbacks {
  onDelta: (delta: string) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamOpeningMessage(
  parsed: ParsedTripInputV2,
  cb: StreamCallbacks,
): Promise<string> {
  const prompt = buildOpeningPrompt(parsed);
  return streamFromClaude(SYSTEM_OPENING, prompt, cb);
}

export async function streamSummaryMessage(
  parsed: ParsedTripInputV2,
  quote: Quote,
  collectedEvents: BuildEvent[],
  cb: StreamCallbacks,
): Promise<string> {
  const prompt = buildSummaryPrompt(parsed, quote, collectedEvents);
  return streamFromClaude(SYSTEM_SUMMARY, prompt, cb);
}

export async function streamRefinementPlan(
  userInput: string,
  intent: RefinementIntent,
  parsed: ParsedTripInputV2 | ParsedTripInput,
  quote: Quote,
  cb: StreamCallbacks,
): Promise<string> {
  const parsedV2 =
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    parsed.version === 2
      ? parsed
      : toParsedTripInputV2(parsed as ParsedTripInput);
  const prompt = buildRefinementPrompt(userInput, intent, parsedV2, quote);
  return streamFromClaude(SYSTEM_REFINEMENT_PLAN, prompt, cb);
}

async function streamFromClaude(
  system: string,
  prompt: string,
  cb: StreamCallbacks,
): Promise<string> {
  let full = "";
  try {
    const result = streamText({
      model: anthropic(NARRATOR_MODEL),
      system,
      prompt,
      temperature: 0.4,
      maxOutputTokens: 500,
      abortSignal: cb.signal,
    });

    for await (const delta of result.textStream) {
      full += delta;
      cb.onDelta(delta);
    }
    return full;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("narrator_failed");
    cb.onError?.(error);
    return full;
  }
}

function buildOpeningPrompt(parsed: ParsedTripInputV2): string {
  const lines: string[] = ["Petición parseada:"];

  if (parsed.legs.length === 1) {
    const leg = parsed.legs[0];
    if (leg.origin) lines.push(`- Origen: ${leg.origin}`);
    lines.push(`- Destino: ${leg.destination}`);
    lines.push(`- Fechas: ${leg.arrivalDate} → ${leg.departureDate}`);
  } else {
    lines.push(`- Multi-destino (${parsed.legs.length} tramos):`);
    parsed.legs.forEach((leg, i) => {
      const from = leg.origin ?? (i > 0 ? parsed.legs[i - 1].destination : "?");
      lines.push(
        `    ${i + 1}. ${from} → ${leg.destination} (${leg.arrivalDate} → ${leg.departureDate})`,
      );
    });
  }

  const adults = parsed.travelers.adults;
  const children = parsed.travelers.children.length;
  lines.push(
    `- Pasajeros: ${adults} adulto${adults !== 1 ? "s" : ""}${
      children > 0 ? `, ${children} niño${children !== 1 ? "s" : ""}` : ""
    }`,
  );

  lines.push(`- Presupuesto: ${describeBudget(parsed.budget)}`);

  const prefs = describePreferences(parsed.preferences);
  if (prefs) lines.push(`- Preferencias: ${prefs}`);

  if (parsed.parsingGaps.length > 0) {
    lines.push(`- Faltan datos: ${parsed.parsingGaps.join(", ")}`);
  }

  lines.push("");
  lines.push(
    "Genera un mensaje breve confirmando la petición y anunciando que vas a empezar. " +
      "Si hay multi-destino, mencionalo. Si faltan datos, dilo brevemente.",
  );

  return lines.join("\n");
}

function describeBudget(budget: ParsedTripInputV2["budget"]): string {
  switch (budget.kind) {
    case "unlimited":
      return "sin límite";
    case "tier":
      return budget.tier;
    case "exact":
      return `${budget.amount} ${budget.currency}${budget.perPerson ? " por persona" : ""}`;
    case "range":
      return `${budget.min}-${budget.max} ${budget.currency}${budget.perPerson ? " por persona" : ""}`;
    case "unspecified":
      return "no especificado";
  }
}

function describePreferences(p: ParsedTripInputV2["preferences"]): string {
  const parts: string[] = [];
  if (p.audience) parts.push(p.audience);
  if (p.hotelStyles.length > 0) parts.push(p.hotelStyles.join("/"));
  if (p.locationPriorities.length > 0) parts.push(p.locationPriorities.join("/"));
  if (p.amenities.length > 0) parts.push(`amenities: ${p.amenities.join(", ")}`);
  if (p.themes.length > 0) parts.push(`tema: ${p.themes.join(", ")}`);
  return parts.join(" · ");
}

function buildSummaryPrompt(
  parsed: ParsedTripInputV2,
  quote: Quote,
  events: BuildEvent[],
): string {
  const lines: string[] = [];

  if (parsed.legs.length === 1) {
    const leg = parsed.legs[0];
    const primaryFlight = quote.flights[0];
    const primaryHotel = quote.hotels[0];
    lines.push(`Cotización para ${leg.destination} terminada.`);
    lines.push(
      primaryFlight
        ? `Vuelo: ${primaryFlight.flightDetails?.airline ?? primaryFlight.provider} ${primaryFlight.price} ${quote.pricing.currency}`
        : "Sin vuelos disponibles",
    );
    lines.push(
      primaryHotel
        ? `Hotel: ${primaryHotel.title} ${primaryHotel.hotelDetails?.netPrice ?? primaryHotel.price} ${quote.pricing.currency}/noche`
        : "Sin hotel",
    );
  } else {
    lines.push(`Cotización multi-destino (${parsed.legs.length} tramos) terminada.`);
    parsed.legs.forEach((leg, i) => {
      const legFlight = quote.flights[i];
      const legHotel = quote.hotels[i];
      lines.push(
        `Leg ${i + 1} ${leg.destination}: ${
          legFlight
            ? `vuelo ${legFlight.flightDetails?.airline ?? legFlight.provider} ${legFlight.price} ${quote.pricing.currency}`
            : "sin vuelo"
        }, ${
          legHotel
            ? `hotel ${legHotel.title} ${legHotel.hotelDetails?.netPrice ?? legHotel.price} ${quote.pricing.currency}/noche`
            : "sin hotel"
        }`,
      );
    });
  }

  const errored = events
    .filter((event) => event.type === "section.error")
    .map((event) => (event as Extract<BuildEvent, { type: "section.error" }>).section);

  lines.push(`Precio total: ${quote.pricing.finalTotal} ${quote.pricing.currency}`);
  lines.push(
    errored.length > 0
      ? `Secciones con error: ${errored.join(", ")}`
      : "Sin errores",
  );
  lines.push("");
  lines.push("Genera un resumen conversacional.");

  return lines.join("\n");
}

function buildRefinementPrompt(
  userInput: string,
  intent: RefinementIntent,
  parsed: ParsedTripInputV2,
  quote: Quote,
): string {
  const primaryHotel = quote.hotels[0];
  const primaryFlight = quote.flights[0];
  const destination = parsed.legs[0]?.destination ?? "?";
  const lines = [
    `Mensaje del agente: "${userInput}"`,
    `Intención clasificada: ${JSON.stringify(intent)}`,
    "",
    "Contexto del quote actual:",
    `- Destino: ${destination}`,
    `- Hotel actual: ${primaryHotel?.title ?? "(sin hotel)"} a ${primaryHotel?.hotelDetails?.netPrice ?? primaryHotel?.price ?? 0} ${quote.pricing.currency}/noche`,
    `- Vuelo actual: ${primaryFlight?.flightDetails?.airline ?? primaryFlight?.provider ?? "(sin vuelo)"} a ${primaryFlight?.price ?? 0} ${quote.pricing.currency}`,
    `- Total actual: ${quote.pricing.finalTotal} ${quote.pricing.currency}`,
    "",
    "Genera el plan según las reglas del system prompt.",
  ];
  return lines.join("\n");
}
