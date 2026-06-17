import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  NARRATOR_MODEL,
  SYSTEM_OPENING,
  SYSTEM_SUMMARY,
  SYSTEM_REFINEMENT_PLAN,
} from "./prompts";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import type { BuildEvent, RefinementIntent } from "@/lib/quote-conversation/types";

interface StreamCallbacks {
  onDelta: (delta: string) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamOpeningMessage(
  parsed: ParsedTripInput,
  cb: StreamCallbacks,
): Promise<string> {
  const prompt = buildOpeningPrompt(parsed);
  return streamFromClaude(SYSTEM_OPENING, prompt, cb);
}

export async function streamSummaryMessage(
  parsed: ParsedTripInput,
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
  parsed: ParsedTripInput,
  quote: Quote,
  cb: StreamCallbacks,
): Promise<string> {
  const prompt = buildRefinementPrompt(userInput, intent, parsed, quote);
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

function buildOpeningPrompt(parsed: ParsedTripInput): string {
  const lines: string[] = ["Petición parseada:"];
  if (parsed.origin) lines.push(`- Origen: ${parsed.origin}`);
  lines.push(`- Destino: ${parsed.destination}`);
  if (parsed.dates?.start && parsed.dates?.end) {
    lines.push(`- Fechas: ${parsed.dates.start} → ${parsed.dates.end}`);
  }
  const adults = parsed.passengers?.adults ?? 0;
  const children = parsed.passengers?.children ?? 0;
  lines.push(
    `- Pasajeros: ${adults} adulto${adults !== 1 ? "s" : ""}${children > 0 ? `, ${children} niño${children !== 1 ? "s" : ""}` : ""}`,
  );
  if (parsed.preferences?.hotelLevel) {
    lines.push(`- Nivel hotel: ${parsed.preferences.hotelLevel}`);
  }

  lines.push("");
  lines.push(
    "Genera un mensaje breve confirmando la petición y anunciando que vas a empezar.",
  );

  return lines.join("\n");
}

function buildSummaryPrompt(
  parsed: ParsedTripInput,
  quote: Quote,
  events: BuildEvent[],
): string {
  const primaryFlight = quote.flights[0];
  const flightLine = primaryFlight
    ? `Vuelo recomendado: ${primaryFlight.flightDetails?.airline ?? primaryFlight.provider} ${primaryFlight.price} ${quote.pricing.currency}`
    : "Sin vuelos disponibles";

  const primaryHotel = quote.hotels[0];
  const hotelLine = primaryHotel
    ? `Hotel recomendado: ${primaryHotel.title} ${primaryHotel.hotelDetails?.netPrice ?? primaryHotel.price} ${quote.pricing.currency}/noche`
    : "Sin hotel";

  const errored = events
    .filter((event) => event.type === "section.error")
    .map((event) => (event as Extract<BuildEvent, { type: "section.error" }>).section);

  const failedLine =
    errored.length > 0
      ? `Secciones con error: ${errored.join(", ")}`
      : "Sin errores";

  return [
    `Cotización para ${parsed.destination} terminada.`,
    flightLine,
    hotelLine,
    `Precio total: ${quote.pricing.finalTotal} ${quote.pricing.currency}`,
    failedLine,
    "",
    "Genera un resumen conversacional.",
  ].join("\n");
}

function buildRefinementPrompt(
  userInput: string,
  intent: RefinementIntent,
  parsed: ParsedTripInput,
  quote: Quote,
): string {
  const primaryHotel = quote.hotels[0];
  const primaryFlight = quote.flights[0];
  const lines = [
    `Mensaje del agente: "${userInput}"`,
    `Intención clasificada: ${JSON.stringify(intent)}`,
    "",
    "Contexto del quote actual:",
    `- Destino: ${parsed.destination}`,
    `- Hotel actual: ${primaryHotel?.title ?? "(sin hotel)"} a ${primaryHotel?.hotelDetails?.netPrice ?? primaryHotel?.price ?? 0} ${quote.pricing.currency}/noche`,
    `- Vuelo actual: ${primaryFlight?.flightDetails?.airline ?? primaryFlight?.provider ?? "(sin vuelo)"} a ${primaryFlight?.price ?? 0} ${quote.pricing.currency}`,
    `- Total actual: ${quote.pricing.finalTotal} ${quote.pricing.currency}`,
    "",
    "Genera el plan según las reglas del system prompt.",
  ];
  return lines.join("\n");
}
