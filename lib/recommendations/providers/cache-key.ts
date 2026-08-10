import type { ProviderCategory } from "./types";

export function buildCacheKey(
  category: ProviderCategory,
  destination: string,
): string {
  const slug = destination
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  return `providers:${category}:${slug}`;
}
