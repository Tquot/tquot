/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de HotelsPoint
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  HotelsPoint: bedbank europeo, foco en hoteles independientes.
 *
 *  Para implementar:
 *  1. Solicitar credenciales comerciales.
 *  2. Documentación NO pública, llega tras acuerdo.
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

export class HotelspointAdapter implements ProviderAdapter {
  readonly providerId = "hotelspoint";
  readonly providerName = "HotelsPoint";
  readonly categories: ProviderCategory[] = ["hotels"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("HotelspointAdapter.testConnection no implementado.");
  }

  async searchHotels(
    _credentials: Credentials,
    _params: HotelSearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedHotel>> {
    throw new Error("HotelspointAdapter.searchHotels no implementado.");
  }
}
