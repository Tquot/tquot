/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de TravelTool
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  TravelTool: plataforma B2B mencionada en entrevistas con agencias.
 *  Documentación oficial pendiente de confirmar.
 *
 *  Para implementar: contacto comercial directo necesario.
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

export class TraveltoolAdapter implements ProviderAdapter {
  readonly providerId = "traveltool";
  readonly providerName = "TravelTool";
  readonly categories: ProviderCategory[] = ["hotels"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("TraveltoolAdapter.testConnection no implementado.");
  }

  async searchHotels(
    _credentials: Credentials,
    _params: HotelSearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedHotel>> {
    throw new Error("TraveltoolAdapter.searchHotels no implementado.");
  }
}
