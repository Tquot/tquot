/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de Duffel
 *  ESTADO: FUNCIONAL — adaptador de referencia para vuelos
 * ─────────────────────────────────────────────────────────────
 *
 *  Docs oficiales: https://duffel.com/docs/api/v2/overview
 *
 *  Autenticación: Bearer token en header Authorization.
 *
 *  Endpoints usados:
 *  - GET  /air/airlines  (test connection, ligero)
 *  - POST /air/offer_requests (crear búsqueda)
 *  - GET  /air/offers (listar ofertas de la búsqueda)
 *
 *  IMPORTANTE — REGLA INNEGOCIABLE:
 *
 *  Este adaptador SOLO usa endpoints de búsqueda (offer_requests, offers).
 *  NUNCA debe usar los endpoints de orders/payments/passengers que emiten
 *  billetes reales. Esa es la frontera entre cotizar y reservar. TQuot
 *  no reserva, así que esos endpoints están prohibidos.
 *
 *  Si en algún futuro alguien (otra IA, otro developer, tú mismo) propone
 *  añadir createOrder() a este adaptador, la respuesta es no. Léete el
 *  README del proyecto para entender por qué.
 */

import type {
  ProviderAdapter,
  ProviderCategory,
  Credentials,
  TestConnectionResult,
  FlightSearchParams,
  NormalizedFlight,
  FlightSlice,
  FlightSegment,
  SearchResult,
  AdapterCallOptions,
} from "../types";
import {
  ConnectorError,
  fetchWithTimeout,
  parseJsonOrThrow,
  tryAdapter,
} from "../utils";

const ENDPOINTS = {
  test: "https://api.duffel.com",
  production: "https://api.duffel.com",
  // Duffel usa el mismo endpoint para test y production; el modo se
  // determina por el access_token (los tokens de test empiezan por "duffel_test_").
} as const;

const DUFFEL_VERSION = "v2";

interface DuffelCredentials {
  access_token: string;
  environment?: "test" | "production";
}

function buildHeaders(creds: DuffelCredentials): Record<string, string> {
  return {
    Authorization: `Bearer ${creds.access_token}`,
    "Duffel-Version": DUFFEL_VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

// ─────────────────────────────────────────────────────────────
// Adaptador
// ─────────────────────────────────────────────────────────────

export class DuffelAdapter implements ProviderAdapter {
  readonly providerId = "duffel";
  readonly providerName = "Duffel";
  readonly categories: ProviderCategory[] = ["flights"];

  // ───── Test connection ─────

  async testConnection(rawCreds: Credentials): Promise<TestConnectionResult> {
    const startedAt = Date.now();
    const creds = this.validateCredentials(rawCreds);

    try {
      const url = `${ENDPOINTS[creds.environment ?? "test"]}/air/airlines?limit=1`;
      const response = await fetchWithTimeout(url, {
        method: "GET",
        headers: buildHeaders(creds),
        timeoutMs: 5_000,
      });

      const data = await parseJsonOrThrow(response, this.providerId);
      const elapsedMs = Date.now() - startedAt;

      if (data?.data) {
        return {
          ok: true,
          message: "Conexión OK con Duffel.",
          elapsedMs,
        };
      }

      return {
        ok: false,
        error: "Respuesta inesperada de Duffel.",
        elapsedMs,
      };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof ConnectorError
            ? err.message
            : (err as Error).message,
        elapsedMs: Date.now() - startedAt,
      };
    }
  }

  // ───── Búsqueda de vuelos ─────

  async searchFlights(
    rawCreds: Credentials,
    params: FlightSearchParams,
    options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedFlight>> {
    const creds = this.validateCredentials(rawCreds);

    return tryAdapter(
      this.providerId,
      this.providerName,
      async () => {
        // Paso 1: crear offer_request
        const slices = [
          {
            origin: params.origin,
            destination: params.destination,
            departure_date: params.departureDate,
          },
        ];
        if (params.returnDate) {
          slices.push({
            origin: params.destination,
            destination: params.origin,
            departure_date: params.returnDate,
          });
        }

        const passengers = [
          ...Array(params.passengers.adults).fill({ type: "adult" }),
          ...Array(params.passengers.children).fill({ type: "child" }),
          ...Array(params.passengers.infants).fill({ type: "infant_without_seat" }),
        ];

        const body: any = {
          data: {
            slices,
            passengers,
          },
        };
        if (params.cabinClass) {
          body.data.cabin_class = params.cabinClass;
        }

        const reqUrl = `${ENDPOINTS[creds.environment ?? "test"]}/air/offer_requests?return_offers=true`;
        const response = await fetchWithTimeout(reqUrl, {
          method: "POST",
          headers: buildHeaders(creds),
          body: JSON.stringify(body),
          timeoutMs: options?.timeoutMs ?? 15_000,
          signal: options?.signal,
        });

        const data = await parseJsonOrThrow(response, this.providerId);
        const offers = data?.data?.offers ?? [];

        if (offers.length === 0) return [];

        return offers.map((offer: any) =>
          this.normalizeFlight(offer, options?.includeRawData)
        );
      },
      options
    );
  }

  // ───── Validación de credenciales ─────

  private validateCredentials(raw: Credentials): DuffelCredentials {
    if (!raw.access_token) {
      throw new ConnectorError(
        "Falta access_token en las credenciales de Duffel",
        "AUTH",
        this.providerId
      );
    }
    return {
      access_token: raw.access_token,
      environment:
        raw.environment === "production" ? "production" : "test",
    };
  }

  // ───── Normalización ─────

  private normalizeFlight(
    offer: any,
    includeRawData?: boolean
  ): NormalizedFlight {
    const slices: FlightSlice[] = (offer.slices ?? []).map((s: any) => {
      const segments: FlightSegment[] = (s.segments ?? []).map((seg: any) => ({
        origin: seg.origin?.iata_code ?? "",
        destination: seg.destination?.iata_code ?? "",
        departureTime: seg.departing_at,
        arrivalTime: seg.arriving_at,
        carrier: seg.marketing_carrier?.iata_code ?? seg.operating_carrier?.iata_code ?? "",
        flightNumber: seg.marketing_carrier_flight_number ?? "",
        cabinClass: seg.passengers?.[0]?.cabin_class ?? "economy",
        durationMinutes: parseDurationToMinutes(seg.duration),
      }));

      return {
        origin: s.origin?.iata_code ?? "",
        destination: s.destination?.iata_code ?? "",
        departureTime: segments[0]?.departureTime ?? "",
        arrivalTime: segments[segments.length - 1]?.arrivalTime ?? "",
        duration: parseDurationToMinutes(s.duration),
        segments,
      };
    });

    return {
      providerOfferId: offer.id,
      slices,
      totalPrice: Number(offer.total_amount ?? 0),
      currency: offer.total_currency ?? "EUR",
      expiresAt: offer.expires_at ?? null,
      _provider: {
        id: this.providerId,
        name: this.providerName,
        rawDataSnippet: includeRawData
          ? offer
          : { id: offer.id, total_amount: offer.total_amount, owner: offer.owner?.iata_code },
      },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Helper: parsear duración ISO 8601 (PT2H30M) a minutos
// ─────────────────────────────────────────────────────────────

function parseDurationToMinutes(iso?: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = match[2] ? Number(match[2]) : 0;
  return hours * 60 + minutes;
}
