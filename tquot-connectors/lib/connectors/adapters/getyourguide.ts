/**
 * ─────────────────────────────────────────────────────────────
 *  Adaptador de GetYourGuide
 *  ESTADO: STUB — pendiente de implementar
 * ─────────────────────────────────────────────────────────────
 *
 *  GetYourGuide Partner API: catálogo global de experiencias.
 *
 *  Docs: https://partner.getyourguide.com/api
 *
 *  Para implementar:
 *  1. Aplicar al programa Partner en partner.getyourguide.com.
 *  2. Recibir partner_id + API key.
 *  3. Endpoint base: https://api.getyourguide.com/1/
 *  4. Búsqueda: GET /1/tours?q=destination&date=YYYY-MM-DD
 *  5. Deep linking con tracking:
 *     https://www.getyourguide.com/-l[location_id]/-t[tour_id]?partner_id=...
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

export class GetyourguideAdapter implements ProviderAdapter {
  readonly providerId = "getyourguide";
  readonly providerName = "GetYourGuide";
  readonly categories: ProviderCategory[] = ["activities"];

  async testConnection(_credentials: Credentials): Promise<TestConnectionResult> {
    throw new Error("GetyourguideAdapter.testConnection no implementado.");
  }

  async searchActivities(
    _credentials: Credentials,
    _params: ActivitySearchParams,
    _options?: AdapterCallOptions
  ): Promise<SearchResult<NormalizedActivity>> {
    throw new Error("GetyourguideAdapter.searchActivities no implementado.");
  }
}
