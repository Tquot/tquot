/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de W2M (World 2 Meet)
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  W2M es el bedbank del grupo Iberostar. Inventario fuerte en
 *  Mediterráneo y Caribe.
 *
 *  Para implementar:
 *  1. Solicitar acceso comercial en https://www.w2m.com/
 *  2. Recibir documentación de API (no es pública).
 *  3. Copiar patrón de hotelbeds.ts adaptando auth y endpoints.
 *  4. Registrar en registry.ts y marcar is_implemented = true.
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

export class W2MAdapter implements ProviderAdapter {
  readonly providerId = "w2m";
  readonly providerName = "W2M";
  readonly categories: ProviderCategory[] = ["hotels"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("W2MAdapter.testConnection no implementado.");
  }

  async searchHotels(
    _credentials: Credentials,
    _params: HotelSearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedHotel>> {
    throw new Error("W2MAdapter.searchHotels no implementado.");
  }
}
