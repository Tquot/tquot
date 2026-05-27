/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de GoGlobal
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  GoGlobal: bedbank B2B internacional, fuerte en Europa.
 *
 *  Para implementar:
 *  1. Solicitar acceso en https://www.goglobal.travel/
 *  2. Las APIs de GoGlobal son típicamente SOAP/XML (verificar docs).
 *  3. Si es XML, importar un parser (fast-xml-parser ya en deps).
 *  4. Copiar patrón general pero adaptado a SOAP.
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

export class GoglobalAdapter implements ProviderAdapter {
  readonly providerId = "goglobal";
  readonly providerName = "GoGlobal";
  readonly categories: ProviderCategory[] = ["hotels"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("GoglobalAdapter.testConnection no implementado.");
  }

  async searchHotels(
    _credentials: Credentials,
    _params: HotelSearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedHotel>> {
    throw new Error("GoglobalAdapter.searchHotels no implementado.");
  }
}
