/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de Amadeus
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  Amadeus tiene VARIAS APIs distintas:
 *  - Self-Service: para developers, gratis hasta cierto volumen
 *    https://developers.amadeus.com/self-service
 *  - Enterprise: para agencias con contrato serio
 *  - GDS clásico (interfaz Command/Cryptic): para terminales de agencia
 *
 *  Para TQuot, en v1 implementar Self-Service. Cuando una agencia
 *  tenga contrato Enterprise, valorar adaptarlo.
 *
 *  Auth: OAuth client credentials → bearer token (cachear con expiración).
 *
 *  Para implementar:
 *  1. Registrar app en https://developers.amadeus.com/
 *  2. Obtener client_id + client_secret.
 *  3. Implementar flujo OAuth: POST /v1/security/oauth2/token con
 *     grant_type=client_credentials, client_id, client_secret.
 *  4. Cachear el access_token (expira ~30 min) y refrescar antes.
 *  5. Endpoint de búsqueda: GET /v2/shopping/flight-offers
 *  6. IMPORTANTE: solo modo búsqueda. NUNCA implementar /v1/booking/flight-orders
 *     (eso es reservar, prohibido en TQuot — ver README).
 */

import type {
  ProviderAdapter,
  ProviderCategory,
  Credentials,
  TestConnectionResult,
  FlightSearchParams,
  NormalizedFlight,
  SearchResult,
  AdapterCallOptions,
} from "../types";

export class AmadeusAdapter implements ProviderAdapter {
  readonly providerId = "amadeus";
  readonly providerName = "Amadeus";
  readonly categories: ProviderCategory[] = ["flights"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("AmadeusAdapter.testConnection no implementado.");
  }

  async searchFlights(
    _credentials: Credentials,
    _params: FlightSearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedFlight>> {
    throw new Error("AmadeusAdapter.searchFlights no implementado.");
  }
}
