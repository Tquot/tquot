import { anonymizeForClaude } from "@/lib/parser/anonymize";
import { detectInputLanguage, type InputLanguageHint } from "@/lib/parser/detect-language";
import { enrichWithAirports } from "@/lib/parser/airport-resolution";
import { ParserEngine } from "@/lib/parser/engine";
import type { TripRequest } from "@/lib/parser/schema";
import type { ParsedTripInput } from "@/lib/quotes/build-quote";
import { tripRequestToParsedTripInput } from "@/lib/quotes/map-parser";
import type { DuffelLocale } from "@/lib/duffel/flights";
import type { ParseEvent, ParseStage } from "@/lib/quote-engine/types";

export interface ParseWithProgressOptions {
  signal?: AbortSignal;
  onEvent: (event: ParseEvent) => void;
  currentDate?: string;
  languageHint?: InputLanguageHint;
  locale?: DuffelLocale;
  previousPartial?: Partial<ParsedTripInput>;
  previousQuestions?: string[];
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error("Parse aborted");
    err.name = "AbortError";
    throw err;
  }
}

function ts(): number {
  return Date.now();
}

function tripRequestToPartialParsedTripInput(
  trip: TripRequest,
): Partial<ParsedTripInput> {
  const full = tripRequestToParsedTripInput(trip);
  return full ?? { destination: trip.destination };
}

function buildParsedTripInput(
  trip: TripRequest,
  locale: DuffelLocale,
): ParsedTripInput | null {
  const enrichedTrip = enrichWithAirports(trip);
  const parsed = tripRequestToParsedTripInput(enrichedTrip);
  if (!parsed) return null;

  return {
    ...parsed,
    locale,
    enrichedTrip,
  };
}

function hasDestinationKeyword(
  text: string,
  previousPartial?: Partial<ParsedTripInput>,
): boolean {
  const lower = text.toLowerCase();
  if (/destino|viaje\s+a|travel\s+to|trip\s+to|vuelo\s+a/i.test(lower)) {
    return true;
  }
  const dest = previousPartial?.destination?.trim();
  if (dest && lower.includes(dest.toLowerCase())) {
    return true;
  }
  return false;
}

function shouldPrependPartialContext(
  text: string,
  previousPartial?: Partial<ParsedTripInput>,
): boolean {
  if (!previousPartial) return false;
  if (text.length < 30) return true;
  return !hasDestinationKeyword(text, previousPartial);
}

function buildParseInput(
  text: string,
  previousPartial?: Partial<ParsedTripInput>,
  previousQuestions?: string[],
): string {
  if (!shouldPrependPartialContext(text, previousPartial)) {
    return text;
  }

  const destination = previousPartial?.destination ?? "";
  const origin = previousPartial?.origin ?? "";
  const adults = previousPartial?.passengers?.adults ?? "";
  const questions = (previousQuestions ?? []).join(" | ");

  return `Contexto previo: destino=${destination}, origen=${origin}, adultos=${adults}. Preguntas pendientes: ${questions}. Respuesta del agente: ${text}`;
}

export async function parseWithProgress(
  text: string,
  {
    signal,
    onEvent,
    currentDate,
    languageHint,
    locale = "es",
    previousPartial,
    previousQuestions,
  }: ParseWithProgressOptions,
): Promise<ParsedTripInput | null> {
  const parseInput = buildParseInput(text, previousPartial, previousQuestions);

  onEvent({ type: "parse.started", ts: ts() });
  assertNotAborted(signal);

  const emitProgress = (stage: ParseStage, partial?: Partial<ParsedTripInput>) => {
    onEvent({
      type: "parse.progress",
      stage,
      ...(partial ? { partial } : {}),
      ts: ts(),
    });
  };

  emitProgress("anonymizing");
  const resolvedLanguage = languageHint ?? detectInputLanguage(parseInput);
  const anonymizedText = anonymizeForClaude(parseInput);
  assertNotAborted(signal);

  emitProgress("extracting");
  const engine = new ParserEngine();
  const result = await engine.parse(
    anonymizedText,
    currentDate ?? new Date().toISOString().slice(0, 10),
    resolvedLanguage,
  );
  assertNotAborted(signal);

  if (result.status === "error") {
    onEvent({ type: "parse.error", error: result.error, ts: ts() });
    throw new Error(result.error);
  }

  if (result.status === "needs_input") {
    const partial = tripRequestToPartialParsedTripInput(result.partialData);
    onEvent({
      type: "parse.needs_input",
      questions: result.questions,
      partial,
      ts: ts(),
    });
    return null;
  }

  emitProgress("enriching", tripRequestToPartialParsedTripInput(result.data));
  assertNotAborted(signal);

  emitProgress("mapping");
  const parsed = buildParsedTripInput(result.data, locale);
  if (!parsed) {
    const message = "No se pudo mapear la petición a un viaje válido.";
    onEvent({ type: "parse.error", error: message, ts: ts() });
    throw new Error(message);
  }

  onEvent({
    type: "parse.progress",
    stage: "mapping",
    partial: parsed,
    ts: ts(),
  });
  onEvent({ type: "parse.complete", parsed, ts: ts() });
  return parsed;
}
