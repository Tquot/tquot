/**
 * ─────────────────────────────────────────────────────────────
 *  Comparador pre-reserva
 * ─────────────────────────────────────────────────────────────
 *
 *  Caso de uso (validado por agente real entrevistada):
 *
 *  Después de cotizar y cuando el cliente acepta, el agente quiere
 *  saber EN QUÉ DE SUS SISTEMAS B2B está el precio más barato para
 *  ese hotel concreto. Hoy hace eso a mano buscando en 7 sistemas →
 *  20-25 minutos por reserva.
 *
 *  Con el comparador: TQuot consulta todos los proveedores conectados
 *  EN PARALELO, normaliza las respuestas, y muestra ranking de precios.
 *
 *  Decisiones de diseño (tomadas con el fundador):
 *
 *  1. Si un proveedor da error → se muestra con el error visible.
 *     NO se oculta. NO se usa precio cacheado. (decisión 1b)
 *
 *  2. Identificación de hoteles entre proveedores → híbrido.
 *     Matching automático por nombre + ciudad, agente confirma. (decisión 2c)
 *     En v1, asumimos que el agente pasa los hotelCodes/identificadores
 *     correctos de cada proveedor (mapeo manual). La automatización va en v2.
 *
 *  3. Timeout: arrancamos tolerante (10s), ajustaremos a 5s cuando
 *     tengamos datos reales de comparator_logs. (decisión 3a → 3c)
 *
 *  4. Resultados devueltos a la vez, no streaming. Más simple para v1.
 *     Si en v2 queremos streaming progresivo, refactorizar con SSE.
 */

import type {
  ProviderAdapter,
  HotelSearchParams,
  NormalizedHotel,
  NormalizedRoom,
  SearchResult,
} from "@/lib/connectors/types";
import { getAdapter } from "@/lib/connectors/registry";

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export interface ComparatorInput {
  /** Lista de conexiones de la agencia a consultar.
   *  Cada una tiene { providerId, credentials, hotelCodesForThisProvider }.
   *  El campo hotelCodes mapea el hotel concreto en CADA proveedor. */
  providers: Array<{
    providerId: string;
    credentials: Record<string, string>;
    /** Códigos de hotel específicos en este proveedor.
     *  Si está vacío, el comparador no consultará este proveedor
     *  (porque no sabe qué hotel buscar en él). */
    hotelCodes: string[];
  }>;

  /** Parámetros de la búsqueda */
  checkIn: string;        // ISO date
  checkOut: string;
  rooms: Array<{
    adults: number;
    childrenAges: number[];
  }>;
  currency?: string;
  language?: string;

  /** Timeout global. Si no se da, default 10s. */
  timeoutMs?: number;
}

export interface ComparatorResultRow {
  providerId: string;
  providerName: string;

  /** Estado de la consulta */
  status: "ok" | "error" | "timeout" | "no_results";

  /** Si status === "ok", el mejor precio encontrado para este hotel/proveedor */
  bestRoom?: {
    roomType: string;
    boardType: string;
    netPrice: number;
    publicPrice: number | null;
    currency: string;
    refundable: boolean;
    providerRoomCode: string;
  };

  /** Tiempo de respuesta del proveedor */
  elapsedMs: number;

  /** Si status !== "ok", mensaje de error legible */
  errorMessage?: string;

  /** Otras habitaciones disponibles (por si el agente quiere ver detalle) */
  alternativeRooms?: Array<{
    roomType: string;
    boardType: string;
    netPrice: number;
    refundable: boolean;
  }>;
}

export interface ComparatorOutput {
  /** Resultados de cada proveedor consultado, ordenados de menor a mayor precio.
   *  Los proveedores con error van al final. */
  results: ComparatorResultRow[];

  /** El ganador (precio más bajo) si hay al menos un resultado ok */
  cheapest: ComparatorResultRow | null;

  /** Tiempo total del comparador (la consulta más lenta) */
  totalElapsedMs: number;

  /** Cuántos proveedores se consultaron, cuántos respondieron OK */
  summary: {
    consulted: number;
    ok: number;
    errors: number;
    timeouts: number;
    noResults: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────

export async function comparePreReserve(
  input: ComparatorInput
): Promise<ComparatorOutput> {
  const startedAt = Date.now();
  const timeoutMs = input.timeoutMs ?? 10_000;
  const globalController = new AbortController();
  const globalTimeout = setTimeout(() => globalController.abort(), timeoutMs);

  try {
    // Construir las promises en paralelo
    const promises = input.providers
      .filter((p) => p.hotelCodes.length > 0)
      .map((p) => consultProvider(p, input, globalController.signal));

    // Esperar a todas (sin Promise.all, queremos resultados aunque alguna falle)
    const results = await Promise.all(
      promises.map((promise) =>
        promise.catch(
          (err): ComparatorResultRow => ({
            providerId: "unknown",
            providerName: "Unknown",
            status: "error",
            elapsedMs: Date.now() - startedAt,
            errorMessage: (err as Error).message ?? "Error desconocido",
          })
        )
      )
    );

    // Ordenar: ok primero (por precio asc), luego no_results, luego errores/timeouts
    const sorted = sortResults(results);

    const cheapest =
      sorted.find((r) => r.status === "ok" && r.bestRoom) ?? null;

    return {
      results: sorted,
      cheapest,
      totalElapsedMs: Date.now() - startedAt,
      summary: summarize(sorted),
    };
  } finally {
    clearTimeout(globalTimeout);
  }
}

// ─────────────────────────────────────────────────────────────
// Consulta a un único proveedor
// ─────────────────────────────────────────────────────────────

async function consultProvider(
  provider: ComparatorInput["providers"][number],
  input: ComparatorInput,
  signal: AbortSignal
): Promise<ComparatorResultRow> {
  const adapter = getAdapter(provider.providerId);

  if (!adapter || !adapter.searchHotels) {
    return {
      providerId: provider.providerId,
      providerName: provider.providerId,
      status: "error",
      elapsedMs: 0,
      errorMessage: "Proveedor no implementado o no soporta búsqueda de hoteles.",
    };
  }

  const startedAt = Date.now();

  const params: HotelSearchParams = {
    destination: { hotelCodes: provider.hotelCodes },
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    rooms: input.rooms,
    currency: input.currency ?? "EUR",
    language: input.language ?? "ENG",
  };

  const result = await adapter.searchHotels(provider.credentials, params, {
    timeoutMs: input.timeoutMs ?? 10_000,
    signal,
  });

  const elapsedMs = Date.now() - startedAt;

  if (!result.ok) {
    return {
      providerId: adapter.providerId,
      providerName: adapter.providerName,
      status: result.errorCode === "TIMEOUT" ? "timeout" : "error",
      elapsedMs,
      errorMessage: result.error,
    };
  }

  if (result.data.length === 0) {
    return {
      providerId: adapter.providerId,
      providerName: adapter.providerName,
      status: "no_results",
      elapsedMs,
      errorMessage: "Sin disponibilidad para estas fechas.",
    };
  }

  // Extraer mejor habitación de todas las que devolvió este proveedor.
  // "Mejor" = precio neto más bajo (es lo que el agente compara).
  const allRooms = result.data.flatMap((hotel) => hotel.rooms);
  if (allRooms.length === 0) {
    return {
      providerId: adapter.providerId,
      providerName: adapter.providerName,
      status: "no_results",
      elapsedMs,
      errorMessage: "Hotel encontrado pero sin habitaciones disponibles.",
    };
  }

  const bestRoom = allRooms.reduce((best, current) =>
    current.netPrice < best.netPrice ? current : best
  );

  const alternativeRooms = allRooms
    .filter((r) => r.providerRoomCode !== bestRoom.providerRoomCode)
    .slice(0, 5)
    .map((r) => ({
      roomType: r.roomType,
      boardType: r.boardType,
      netPrice: r.netPrice,
      refundable: r.refundable,
    }));

  return {
    providerId: adapter.providerId,
    providerName: adapter.providerName,
    status: "ok",
    elapsedMs,
    bestRoom: {
      roomType: bestRoom.roomType,
      boardType: bestRoom.boardType,
      netPrice: bestRoom.netPrice,
      publicPrice: bestRoom.publicPrice,
      currency: bestRoom.currency,
      refundable: bestRoom.refundable,
      providerRoomCode: bestRoom.providerRoomCode,
    },
    alternativeRooms,
  };
}

// ─────────────────────────────────────────────────────────────
// Orden y resumen
// ─────────────────────────────────────────────────────────────

function sortResults(results: ComparatorResultRow[]): ComparatorResultRow[] {
  // Order: ok (asc por precio) → no_results → timeout → error
  const statusOrder: Record<ComparatorResultRow["status"], number> = {
    ok: 0,
    no_results: 1,
    timeout: 2,
    error: 3,
  };

  return [...results].sort((a, b) => {
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    if (a.status === "ok" && b.status === "ok") {
      return (a.bestRoom?.netPrice ?? 0) - (b.bestRoom?.netPrice ?? 0);
    }
    return 0;
  });
}

function summarize(results: ComparatorResultRow[]) {
  return {
    consulted: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    errors: results.filter((r) => r.status === "error").length,
    timeouts: results.filter((r) => r.status === "timeout").length,
    noResults: results.filter((r) => r.status === "no_results").length,
  };
}

// Bloque A — tipos del comparador coherente (snapshot vs live).
// Runtime: importar desde ./orchestrator y ./refresh-snapshot (server-only).
export type {
  ComparatorEntry,
  ComparatorRequest,
  ComparatorResponse,
  ComparatorHotelSnapshot,
  ComparatorSearchContext,
  ProviderKey,
  RefreshSnapshotInput,
  RefreshSnapshotResult,
} from "./types";
