/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de 6Tours
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  6Tours: bedbank con foco en destinos vacacionales.
 *
 *  Para implementar:
 *  1. Solicitar acceso comercial.
 *  2. Esperar documentación bajo acuerdo.
 *  3. Adaptar patrón de hotelbeds.ts.
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

export class SixToursAdapter implements ProviderAdapter {
  readonly providerId = "6tours";
  readonly providerName = "6Tours";
  readonly categories: ProviderCategory[] = ["hotels"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("SixToursAdapter.testConnection no implementado.");
  }

  async searchHotels(
    _credentials: Credentials,
    _params: HotelSearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedHotel>> {
    throw new Error("SixToursAdapter.searchHotels no implementado.");
  }
}
