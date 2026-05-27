/**
 * Utilidades comunes para todos los adaptadores.
 *
 * - fetchWithTimeout: fetch que respeta AbortSignal y timeout
 * - ConnectorError: errores tipados que los adaptadores lanzan
 * - tryAdapter: wrapper que convierte excepciones a SearchResult
 */

import type { SearchResult, AdapterCallOptions } from "../types";

// ─────────────────────────────────────────────────────────────
// Errores tipados
// ─────────────────────────────────────────────────────────────

export type ConnectorErrorCode =
  | "TIMEOUT"
  | "AUTH"
  | "RATE_LIMIT"
  | "NO_RESULTS"
  | "API_ERROR"
  | "NETWORK"
  | "INVALID_PARAMS"
  | "UNKNOWN";

export class ConnectorError extends Error {
  constructor(
    message: string,
    public readonly code: ConnectorErrorCode,
    public readonly providerId: string,
    public readonly httpStatus?: number,
    public readonly rawResponse?: unknown
  ) {
    super(message);
    this.name = "ConnectorError";
  }
}

// ─────────────────────────────────────────────────────────────
// fetchWithTimeout
// ─────────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeoutMs = 10_000, signal: externalSignal, ...init } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Encadenar la signal externa (si la hay) con la del timeout
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort());
    }
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ConnectorError(
        `Timeout tras ${timeoutMs}ms`,
        "TIMEOUT",
        "unknown"
      );
    }
    throw new ConnectorError(
      `Error de red: ${(err as Error).message}`,
      "NETWORK",
      "unknown"
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─────────────────────────────────────────────────────────────
// tryAdapter: wrapper para envolver una llamada a un adaptador
// y convertir cualquier excepción en SearchResult de error.
// ─────────────────────────────────────────────────────────────
//
// Esto evita que cada adaptador tenga que repetir try/catch.
// El adaptador puede lanzar ConnectorError libremente y tryAdapter
// lo convierte en SearchResult { ok: false, ... }.
// ─────────────────────────────────────────────────────────────

export async function tryAdapter<T>(
  providerId: string,
  providerName: string,
  fn: () => Promise<T[]>,
  options?: AdapterCallOptions
): Promise<SearchResult<T>> {
  const startedAt = Date.now();
  try {
    const data = await fn();
    return {
      ok: true,
      data,
      elapsedMs: Date.now() - startedAt,
      providerInfo: { id: providerId, name: providerName },
    };
  } catch (err) {
    const elapsedMs = Date.now() - startedAt;

    if (err instanceof ConnectorError) {
      return {
        ok: false,
        error: err.message,
        errorCode: err.code,
        elapsedMs,
        providerInfo: { id: providerId, name: providerName },
      };
    }

    return {
      ok: false,
      error: (err as Error).message ?? "Error desconocido",
      errorCode: "UNKNOWN",
      elapsedMs,
      providerInfo: { id: providerId, name: providerName },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers para parseo de respuestas HTTP
// ─────────────────────────────────────────────────────────────

export async function parseJsonOrThrow<T = unknown>(
  response: Response,
  providerId: string
): Promise<T> {
  if (!response.ok) {
    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch {
      // ignore
    }

    // Mapear códigos HTTP a ConnectorErrorCode
    const code: ConnectorErrorCode =
      response.status === 401 || response.status === 403
        ? "AUTH"
        : response.status === 429
        ? "RATE_LIMIT"
        : response.status >= 500
        ? "API_ERROR"
        : "API_ERROR";

    throw new ConnectorError(
      `HTTP ${response.status}: ${bodyText.slice(0, 300)}`,
      code,
      providerId,
      response.status,
      bodyText
    );
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    throw new ConnectorError(
      `Respuesta no es JSON válido: ${(err as Error).message}`,
      "API_ERROR",
      providerId
    );
  }
}

// ─────────────────────────────────────────────────────────────
// nightsBetween: helper para calcular noches entre dos fechas ISO
// ─────────────────────────────────────────────────────────────

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}
