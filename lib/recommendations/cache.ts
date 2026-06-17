import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { RecommendedProvider } from "./types";

const TTL_DAYS = 30;

interface CacheKey {
  category: string;
  destination: string;
}

interface CacheHit {
  providers: RecommendedProvider[];
  generatedAt: string;
  expiresAt: string;
}

export async function readCache(key: CacheKey): Promise<CacheHit | null> {
  try {
    const supabase = createServiceClient();
    const normalized = normalizeDestination(key.destination);

    const { data, error } = await supabase
      .from("recommendation_cache")
      .select("providers, generated_at, expires_at")
      .eq("category", key.category)
      .eq("destination_normalized", normalized)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("[recommendation_cache] read error:", error);
      return null;
    }
    if (!data) return null;

    return {
      providers: data.providers as RecommendedProvider[],
      generatedAt: data.generated_at,
      expiresAt: data.expires_at,
    };
  } catch (err) {
    console.error("[recommendation_cache] read failed:", err);
    return null;
  }
}

export async function writeCache(
  key: CacheKey,
  providers: RecommendedProvider[],
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const normalized = normalizeDestination(key.destination);
    const now = new Date();
    const expires = new Date(now.getTime() + TTL_DAYS * 86_400_000);

    const { error } = await supabase.from("recommendation_cache").upsert(
      {
        category: key.category,
        destination_normalized: normalized,
        providers,
        generated_at: now.toISOString(),
        expires_at: expires.toISOString(),
      },
      {
        onConflict: "category,destination_normalized",
      },
    );

    if (error) {
      console.error("[recommendation_cache] write error:", error);
    }
  } catch (err) {
    console.error("[recommendation_cache] write failed:", err);
  }
}

export function normalizeDestination(dest: string): string {
  return dest
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}
