import { z } from "zod";
import {
  TripRequestSchema,
  type TripRequest,
  type ParserQuestion,
} from "./schema";
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_USER_PROMPT,
  MERGE_SYSTEM_PROMPT,
  MERGE_USER_PROMPT,
  PROMPT_VERSION,
} from "./prompts";
import { callStructured } from "./anthropic-client";
import type { InputLanguageHint } from "./detect-language";

const TripRequestInputSchema = z.preprocess(normalizeToV1, TripRequestSchema);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function looksLikeV2(raw: Record<string, unknown>): boolean {
  if (raw.version === 2) return true;
  if (!Array.isArray(raw.legs) || raw.legs.length === 0) return false;
  return typeof raw.destination !== "string";
}

/** Maps v2-shaped model output back to v1 TripRequest before Zod validation. */
function normalizeToV1(raw: unknown): TripRequest {
  console.log(
    "[normalizeToV1] input keys:",
    typeof raw === "object" && raw !== null ? Object.keys(raw) : typeof raw,
  );
  console.log(
    "[normalizeToV1] has legs:",
    typeof raw === "object" && raw !== null && "legs" in raw,
  );
  console.log(
    "[normalizeToV1] has destination:",
    typeof raw === "object" && raw !== null && "destination" in raw,
  );

  if (!isRecord(raw) || !looksLikeV2(raw)) {
    return raw as TripRequest;
  }

  const legs = raw.legs as unknown[];
  const firstLeg = isRecord(legs[0]) ? legs[0] : null;
  const travelers = isRecord(raw.travelers) ? raw.travelers : null;
  const parsingGaps = Array.isArray(raw.parsingGaps) ? raw.parsingGaps : [];

  const v1: Record<string, unknown> = { ...raw };

  if (firstLeg) {
    if (typeof firstLeg.destination === "string") {
      v1.destination = firstLeg.destination;
    }
    if (typeof firstLeg.origin === "string") {
      v1.origin = firstLeg.origin;
    }
    if (typeof firstLeg.arrivalDate === "string") {
      v1.departureDate = firstLeg.arrivalDate;
    }
    if (typeof firstLeg.departureDate === "string") {
      v1.returnDate = firstLeg.departureDate;
    }
  }

  if (travelers) {
    if (typeof travelers.adults === "number") {
      v1.adults = travelers.adults;
    }
    if (Array.isArray(travelers.children)) {
      v1.children = travelers.children.length;
    }
  }

  if (typeof v1.status !== "string") {
    v1.status = parsingGaps.length > 0 ? "needs_input" : "ready";
  }

  delete v1.version;
  delete v1.legs;
  delete v1.travelers;
  delete v1.budget;
  delete v1.preferences;
  delete v1.parsingGaps;
  delete v1.rawInput;
  delete v1.notes;

  return v1 as TripRequest;
}

export type ParserResult =
  | { status: "ready"; data: TripRequest; promptVersion: string }
  | {
      status: "needs_input";
      questions: ParserQuestion[];
      partialData: TripRequest;
      promptVersion: string;
    }
  | { status: "error"; error: string; promptVersion: string };

export class ParserEngine {
  /**
   * Turno 1: extracción inicial desde texto libre del agente o cliente.
   */
  async parse(
    rawInput: string,
    currentDate: string = new Date().toISOString().slice(0, 10),
    languageHint?: InputLanguageHint,
  ): Promise<ParserResult> {
    try {
      const extracted = await this.extract(rawInput, currentDate, languageHint);
      return await this.evaluateCompleteness(extracted);
    } catch (err) {
      return {
        status: "error",
        error: (err as Error).message,
        promptVersion: PROMPT_VERSION,
      };
    }
  }

  /**
   * Turno N: el agente responde a las preguntas pendientes.
   */
  async merge(
    partialData: TripRequest,
    answers: Record<string, string>,
    languageHint?: InputLanguageHint,
  ): Promise<ParserResult> {
    try {
      const merged = await this.mergeAnswers(partialData, answers, languageHint);
      return await this.evaluateCompleteness(merged);
    } catch (err) {
      return {
        status: "error",
        error: (err as Error).message,
        promptVersion: PROMPT_VERSION,
      };
    }
  }

  // ───── Extracción inicial ─────
  private async extract(
    rawInput: string,
    currentDate: string,
    languageHint?: InputLanguageHint,
  ): Promise<TripRequest> {
    return callStructured({
      schema: TripRequestInputSchema,
      system: EXTRACTION_SYSTEM_PROMPT,
      userMessage: EXTRACTION_USER_PROMPT(rawInput, currentDate, languageHint),
      maxTokens: 2048,
    });
  }

  // ───── Fusión de respuestas ─────
  private async mergeAnswers(
    partial: TripRequest,
    answers: Record<string, string>,
    languageHint?: InputLanguageHint,
  ): Promise<TripRequest> {
    return callStructured({
      schema: TripRequestSchema,
      system: MERGE_SYSTEM_PROMPT,
      userMessage: MERGE_USER_PROMPT(partial, answers, languageHint),
      maxTokens: 2048,
    });
  }

  // ───── ¿Está completo o necesita más datos? ─────
  private async evaluateCompleteness(data: TripRequest): Promise<ParserResult> {
    if (data.status === "ready") {
      return { status: "ready", data, promptVersion: PROMPT_VERSION };
    }

    const questions = data.questions ?? [];

    // Si por alguna razón el modelo no devuelve preguntas, lo damos por listo
    // para no bloquear al agente (decisión conservadora).
    if (questions.length === 0) {
      return { status: "ready", data, promptVersion: PROMPT_VERSION };
    }

    return {
      status: "needs_input",
      questions,
      partialData: data,
      promptVersion: PROMPT_VERSION,
    };
  }
}
