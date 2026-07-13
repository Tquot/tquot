import "server-only";

const EXCHANGE_API_URL =
  process.env.EXCHANGE_RATE_API_URL ?? "https://open.er-api.com/v6/latest";

interface FetcherResponse {
  base: string;
  rates: Record<string, number>;
}

/**
 * Obtiene tipos de cambio desde la API gratuita. Devuelve todos los pares from→X.
 */
export async function fetchRatesFor(from: string): Promise<FetcherResponse> {
  const response = await fetch(`${EXCHANGE_API_URL}/${from.toUpperCase()}`, {
    next: { revalidate: 86_400 },
  });

  if (!response.ok) {
    throw new Error(`exchange_api_http_${response.status}`);
  }

  const data = (await response.json()) as {
    rates?: Record<string, number>;
  };

  if (!data.rates || typeof data.rates !== "object") {
    throw new Error("exchange_api_invalid_format");
  }

  return {
    base: from.toUpperCase(),
    rates: data.rates,
  };
}
