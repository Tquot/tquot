/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de RateHawk
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  Para implementar este adaptador:
 *
 *  1. Solicitar credenciales de partner en https://www.ratehawk.com/
 *     (RateHawk pertenece a Emerging Travel Group / ETG).
 *  2. Leer las docs: https://docs.ratehawk.com/
 *  3. Copiar el patrón de hotelbeds.ts adaptando:
 *     - Autenticación (RateHawk usa key_id + api_key, distinto a Hotelbeds)
 *     - Endpoint de búsqueda
 *     - Estructura de la request/response
 *  4. Implementar testConnection() y searchHotels()
 *  5. En registry.ts, descomentar la línea registry.set("ratehawk", ...)
 *  6. En la migración de provider_catalog, UPDATE is_implemented = true
 *  7. Verificar con el endpoint de debug
 *
 *  Patrón de URL típico: https://api.worldota.net/api/b2b/v3/
 *  (verificar con docs actuales antes de implementar)
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

export class RatehawkAdapter implements ProviderAdapter {
  readonly providerId = "ratehawk";
  readonly providerName = "RateHawk";
  readonly categories: ProviderCategory[] = ["hotels"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("RatehawkAdapter.testConnection no implementado. Ver docs en el header del archivo.");
  }

  async searchHotels(
    _credentials: Credentials,
    _params: HotelSearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedHotel>> {
    throw new Error("RatehawkAdapter.searchHotels no implementado.");
  }
}
