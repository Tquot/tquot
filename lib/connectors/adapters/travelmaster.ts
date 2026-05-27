/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de Travelmaster
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  Travelmaster: plataforma B2B usada por agencias españolas pequeñas.
 *
 *  Auth: basic_auth (user + password).
 *
 *  Para implementar:
 *  1. Solicitar acceso a través de su web.
 *  2. La API puede ser SOAP o REST según contrato.
 *  3. Adaptar patrón con basic auth en cabecera Authorization.
 */

import type {
  ProviderAdapter,
  ProviderCategory,
  Credentials,
  TestConnectionResult,
  HotelSearchParams,
  NormalizedHotel,
  SearchResult,
  AdapterCallOptions,
} from "../types";

export class TravelmasterAdapter implements ProviderAdapter {
  readonly providerId = "travelmaster";
  readonly providerName = "Travelmaster";
  readonly categories: ProviderCategory[] = ["hotels"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("TravelmasterAdapter.testConnection no implementado.");
  }

  async searchHotels(
    _credentials: Credentials,
    _params: HotelSearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedHotel>> {
    throw new Error("TravelmasterAdapter.searchHotels no implementado.");
  }
}
