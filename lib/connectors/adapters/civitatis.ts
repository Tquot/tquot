/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de Civitatis
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  Civitatis: catálogo de excursiones y actividades en español.
 *  Fuerte en destinos hispanohablantes (Latinoamérica, España).
 *
 *  Para implementar:
 *  1. Solicitar acceso a su programa de afiliados/partners en civitatis.com.
 *  2. Recibir API key.
 *  3. La API es REST con JSON.
 *  4. Endpoint típico: GET /v1/activities con filtros por ciudad/fecha.
 *  5. Para deep linking, Civitatis suele aceptar URLs con tracking de afiliado:
 *     https://www.civitatis.com/es/[destino]/[actividad]?aid=PARTNER_ID
 */

import type {
  ProviderAdapter,
  ProviderCategory,
  Credentials,
  TestConnectionResult,
  ActivitySearchParams,
  NormalizedActivity,
  SearchResult,
  AdapterCallOptions,
} from "../types";

export class CivitatisAdapter implements ProviderAdapter {
  readonly providerId = "civitatis";
  readonly providerName = "Civitatis";
  readonly categories: ProviderCategory[] = ["activities"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("CivitatisAdapter.testConnection no implementado.");
  }

  async searchActivities(
    _credentials: Credentials,
    _params: ActivitySearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedActivity>> {
    throw new Error("CivitatisAdapter.searchActivities no implementado.");
  }
}
