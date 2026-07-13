import "server-only";
import {
  hotelbedsBaseUrl,
  parseHotelbedsCredentials,
} from "@/lib/connectors/adapters/hotelbeds";
import type { Credentials } from "@/lib/connectors/types";
import { fetchWithTimeout } from "@/lib/connectors/utils";
import { createHash } from "crypto";

interface CheckRatesInput {
  rateKey: string;
  credentials: Credentials;
}

export interface CheckRatesResponse {
  ok: boolean;
  /** Precio neto total de la estancia (Hotelbeds `net`). */
  netPrice?: number;
  currency?: string;
  /** A veces Hotelbeds devuelve un rateKey actualizado. */
  rateKey?: string;
  error?: string;
}

function buildSignature(apiKey: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return createHash("sha256")
    .update(apiKey + secret + timestamp)
    .digest("hex");
}

/**
 * Valida disponibilidad de un rateKey concreto vía checkrates.
 */
export async function checkRates(
  input: CheckRatesInput,
): Promise<CheckRatesResponse> {
  try {
    const creds = parseHotelbedsCredentials(input.credentials);
    const url = `${hotelbedsBaseUrl(creds)}/hotel-api/1.0/checkrates`;

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Api-key": creds.api_key,
        "X-Signature": buildSignature(creds.api_key, creds.secret),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rooms: [{ rateKey: input.rateKey }],
      }),
      timeoutMs: 12_000,
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        error: `http_${response.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as {
      hotel?: {
        rooms?: Array<{
          rates?: Array<{
            net?: string | number;
            currency?: string;
            rateKey?: string;
          }>;
        }>;
      };
    };

    const rate = data.hotel?.rooms?.[0]?.rates?.[0];
    if (!rate) {
      return { ok: false, error: "rate_not_available" };
    }

    return {
      ok: true,
      netPrice: Number(rate.net),
      currency: rate.currency ?? "EUR",
      rateKey: rate.rateKey ?? input.rateKey,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "network_error",
    };
  }
}
