import { createHash } from "crypto";

/**
 * Hotelbeds X-Signature = SHA-256(apiKey + secret + unixTimestamp).
 * Shared by connectors adapter, content API, and onboarding credential tests.
 */
export function hotelbedsSignature(
  apiKey: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): { signature: string; timestamp: number } {
  const signature = createHash("sha256")
    .update(apiKey + secret + timestamp)
    .digest("hex");
  return { signature, timestamp };
}

export function hotelbedsAuthHeaders(
  apiKey: string,
  secret: string,
): Record<string, string> {
  const { signature } = hotelbedsSignature(apiKey, secret);
  return {
    "Api-key": apiKey,
    "X-Signature": signature,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Encoding": "gzip",
  };
}
