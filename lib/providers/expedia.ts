import type { ProviderPriceResult, ProviderSearchParams } from "./types";

export async function queryExpediaPrice(
  _params: ProviderSearchParams,
): Promise<ProviderPriceResult> {
  throw new Error("expedia_not_configured");
}
