import type { BuildEvent, QuoteSection, RecommendationEvent } from "@/lib/quote-conversation/types";
import type { ParsedTripInputV2, TripLeg } from "@/lib/quote-engine/schemas-v2";
import type { Flight, Hotel, Experience, Transfer } from "@/lib/quote-engine/types";
import { getEntry, type ServiceCategory } from "@/lib/recommendations/catalog";
import { tplBlocker, tplNoResults } from "@/lib/agent/templates";

const SECTION_LABEL: Record<QuoteSection, string> = {
  flights: "vuelos",
  hotels: "hoteles",
  experiences: "experiencias",
  transfers: "traslados",
};

/**
 * Narración durante el build.
 * Template-first: section.started → silencio (BuildProgress ya lo muestra).
 * section.done con resultados → silencio; vacío → blocker corto.
 * section.error → blocker.
 */
export function narrateBuildEvent(
  event: BuildEvent,
  parsed: ParsedTripInputV2,
): string | null {
  const leg =
    "legId" in event && event.legId
      ? (parsed.legs.find((l) => l.id === event.legId) ?? null)
      : null;

  switch (event.type) {
    case "section.started":
      // Silencio: el BuildProgress cubre el progreso.
      return null;

    case "section.done":
      switch (event.section) {
        case "flights":
          return emptyOrNull(event.results as Flight[], "flights", leg);
        case "hotels":
          return emptyOrNull(event.results as Hotel[], "hotels", leg);
        case "experiences":
          // Experiencias vacías no son blocker (opcionales).
          return null;
        case "transfers":
          return null;
      }
      return null;

    case "section.error":
      return narrateSectionError(event.section, event.error, event.skipped, leg);

    default:
      return null;
  }
}

function emptyOrNull(
  results: unknown[],
  section: string,
  leg: TripLeg | null,
): string | null {
  if (results.length > 0) return null;
  const hint = leg
    ? `Revisa fechas o ${leg.destination}.`
    : "Revisa fechas o destino.";
  return tplNoResults(section, hint);
}

export function narrateRecommendationEvent(
  event: RecommendationEvent,
): string | null {
  switch (event.type) {
    case "recommendation.done": {
      // Silencio por defecto: las recomendaciones van al canvas.
      return null;
    }
    case "recommendation.error": {
      const entry = getEntry(event.category as ServiceCategory);
      return tplBlocker(entry.label, [], false);
    }
    case "recommendation.started":
      return null;
  }
}

function narrateSectionError(
  section: QuoteSection,
  error: string,
  skipped: boolean,
  leg: TripLeg | null,
): string {
  const provider = SECTION_LABEL[section];
  if (skipped) {
    return tplBlocker(provider, [], false);
  }
  const where = leg ? ` (${leg.destination})` : "";
  const msg = tplBlocker(`${provider}${where}`, [], true);
  // Mantener pista corta del error sin narrar proceso
  const short = shortError(error);
  const candidate = `${msg} ${short}`.trim();
  return candidate.length <= 120 ? candidate : msg;
}

function shortError(error: string): string {
  const cleaned = error.replace(/^[A-Za-z]+(?:Api|Error)?:\s*/, "");
  return cleaned.length > 40 ? cleaned.slice(0, 37) + "…" : cleaned;
}
