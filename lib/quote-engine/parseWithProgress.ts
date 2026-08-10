import { anonymizeForClaude } from "@/lib/parser/anonymize";
import { detectInputLanguage, type InputLanguageHint } from "@/lib/parser/detect-language";
import { enrichWithAirports } from "@/lib/parser/airport-resolution";
import { ParserEngine } from "@/lib/parser/engine";
import { parseInformal } from "@/lib/parser/parse-informal";
import { buildProbe } from "@/lib/agent/probe";
import type { TripRequest } from "@/lib/parser/schema";
import type { ParsedTripInput } from "@/lib/quotes/build-quote";
import { tripRequestToParsedTripInput } from "@/lib/quotes/map-parser";
import type { DuffelLocale } from "@/lib/duffel/flights";
import type { ParseEvent, ParseStage } from "@/lib/quote-engine/types";
import { v2LegToParsedTripInput } from "@/lib/quote-engine/internal";
import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";

export interface ParseWithProgressOptions {
  signal?: AbortSignal;
  onEvent: (event: ParseEvent) => void;
  currentDate?: string;
  languageHint?: InputLanguageHint;
  locale?: DuffelLocale;
  previousPartial?: Partial<ParsedTripInput>;
  previousQuestions?: string[];
  /** Origen por defecto de la agencia (asunción). */
  agencyDefaultOrigin?: string;
  agencyId?: string;
  /** Si false, salta el pipeline informal y usa solo ParserEngine. */
  useInformalPipeline?: boolean;
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

/** Convierte el resultado informal v2 al shape v1 que consume el store/canvas. */
export function informalV2ToBuildInput(
  parsed: ParsedTripInputV2,
  locale: DuffelLocale = "es",
): ParsedTripInput {
  const leg = parsed.legs[0];
  if (!leg) {
    throw new Error("Informal parse sin legs");
  }
  const v1 = v2LegToParsedTripInput(leg, parsed, 0, {});
  return { ...v1, locale };
}

function partialFromV2(parsed: ParsedTripInputV2): Partial<ParsedTripInput> {
  const leg = parsed.legs[0];
  return {
    origin: leg?.origin,
    destination: leg?.destination,
    dates: leg
      ? { start: leg.arrivalDate, end: leg.departureDate }
      : undefined,
    passengers: {
      adults: parsed.travelers.adults,
      children: parsed.travelers.children.length,
    },
  };
}

async function parseInformalWithProgress(
  text: string,
  {
    signal,
    onEvent,
    locale = "es",
    agencyDefaultOrigin = "Madrid",
    agencyId = "",
  }: ParseWithProgressOptions,
): Promise<ParsedTripInput | null> {
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
  assertNotAborted(signal);

  emitProgress("extracting");
  const result = await parseInformal(text, {
    agencyDefaultOrigin,
    agencyId,
    locale,
  });
  assertNotAborted(signal);

  const partial = partialFromV2(result.parsed);
  emitProgress("enriching", partial);

  if (result.blocking.length > 0) {
    const probe = buildProbe(result.blocking);
    onEvent({
      type: "parse.progress",
      stage: "enriching",
      partial,
      ts: ts(),
    });
    // Emit assumptions even when probing — the rest is already assumed and visible.
    onEvent({
      type: "parse.needs_input",
      questions: result.blocking.map((b) => b.question),
      partial,
      assumptions: result.assumptions,
      sourceMessage: result.sourceMessage,
      probeActions: probe?.actions?.map((a) =>
        a.patch.type === "setField"
          ? {
              id: a.id,
              label: a.label,
              field: a.patch.field,
              value: a.patch.value,
            }
          : {
              id: a.id,
              label: a.label,
              field: "",
              value: null,
            },
      ),
      ts: ts(),
    });
    // Side-channel: store assumptions via a synthetic complete-shaped progress
    // handled in sse-client by reading optional fields on needs_input.
    return null;
  }

  emitProgress("mapping", partial);
  const parsed = informalV2ToBuildInput(result.parsed, locale);

  onEvent({
    type: "parse.complete",
    parsed,
    assumptions: result.assumptions,
    sourceMessage: result.sourceMessage,
    ts: ts(),
  });
  return parsed;
}

async function parseLegacyWithProgress(
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

export async function parseWithProgress(
  text: string,
  options: ParseWithProgressOptions,
): Promise<ParsedTripInput | null> {
  const useInformal = options.useInformalPipeline !== false;

  // Respuestas a preguntas pendientes: seguir con el engine legacy (merge context).
  if (options.previousQuestions && options.previousQuestions.length > 0) {
    return parseLegacyWithProgress(text, options);
  }

  if (useInformal) {
    try {
      return await parseInformalWithProgress(text, options);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      // Fallback silencioso al parser legacy si el informal falla de forma rara
      return parseLegacyWithProgress(text, options);
    }
  }

  return parseLegacyWithProgress(text, options);
}
