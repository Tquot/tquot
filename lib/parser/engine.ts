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
      schema: TripRequestSchema,
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
