import type { DuffelLocale } from "@/lib/duffel/flights";

export function isDuffelLocale(value: unknown): value is DuffelLocale {
  return value === "es" || value === "en";
}

export function resolveDuffelLocale(options: {
  bodyLocale?: unknown;
  acceptLanguage?: string | null;
}): DuffelLocale {
  if (isDuffelLocale(options.bodyLocale)) {
    return options.bodyLocale;
  }

  const header = options.acceptLanguage?.toLowerCase() ?? "";
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim() ?? "";
    if (tag.startsWith("en")) {
      return "en";
    }
  }

  return "es";
}
