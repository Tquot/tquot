/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de Smytravel
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  Smytravel: plataforma B2B mencionada en entrevistas con agencias.
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

export class SmytravelAdapter implements ProviderAdapter {
  readonly providerId = "smytravel";
  readonly providerName = "Smytravel";
  readonly categories: ProviderCategory[] = ["hotels"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("SmytravelAdapter.testConnection no implementado.");
  }

  async searchHotels(
    _credentials: Credentials,
    _params: HotelSearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedHotel>> {
    throw new Error("SmytravelAdapter.searchHotels no implementado.");
  }
}
