import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { ProviderCategory } from "./types";

interface CategorySignal {
  category: ProviderCategory;
  /** Prioridad: la accesibilidad gana siempre a lo temático. */
  priority: number;
  match: (ctx: DetectionContext) => boolean;
}

export interface DetectionContext {
  parsed: ParsedTripInputV2;
  /** Texto original de la petición, en minúsculas. */
  raw: string;
  /** Preferencia por defecto de la agencia (columna accessibility_default). */
  agencyAccessibilityDefault: boolean;
}

const SIGNALS: CategorySignal[] = [
  {
    category: "accessible",
    priority: 1,
    match: (c) =>
      c.agencyAccessibilityDefault ||
      c.parsed.preferences.themes.some((t) => /accessib/i.test(t)) ||
      c.parsed.preferences.accessibility.length > 0 ||
      !!c.parsed.preferences.accessibilityProfile ||
      /\b(silla de ruedas|movilidad reducida|pmr|accesibilidad|persona con discapacidad|personas con discapacidad|discapacidad visual|discapacidad auditiva|usuario de silla|wheelchair|accessible)\b/.test(
        c.raw,
      ),
  },
  {
    category: "wine",
    priority: 2,
    match: (c) =>
      /\b(enoturismo|bodegas?|viñedos?|cata de vinos?|ruta del vino|denominaci[oó]n de origen|wine\s?tour|vineyard)\b/.test(
        c.raw,
      ) || c.parsed.preferences.themes.some((t) => /vino|wine|enotur/i.test(t)),
  },
  {
    category: "gastronomy",
    priority: 2,
    match: (c) =>
      /\b(gastron[oó]mic[oa]|ruta gastron[oó]mica|clase de cocina|cooking class|estrella michelin|mercado local|food tour)\b/.test(
        c.raw,
      ) ||
      c.parsed.preferences.themes.some((t) =>
        /gastron|gourmet|culinari|food/i.test(t),
      ),
  },
  {
    category: "nautical",
    priority: 2,
    match: (c) =>
      /\b(buceo|submarinismo|snorkel|vela|catamar[aá]n|alquiler de barco|chárter n[aá]utico|kayak|diving|sailing)\b/.test(
        c.raw,
      ),
  },
  {
    category: "adventure",
    priority: 2,
    match: (c) =>
      /\b(aventura|senderismo|trekking|barranquismo|escalada|rafting|parapente|bicicleta de monta[nñ]a|btt|safari|hiking)\b/.test(
        c.raw,
      ) ||
      c.parsed.preferences.themes.some((t) =>
        /aventura|adventure|trek|hiking/i.test(t),
      ),
  },
  {
    category: "culture",
    priority: 3,
    match: (c) =>
      /\b(gu[ií]a oficial|visita guiada|patrimonio|museos?|arqueol[oó]gic[oa]|casco hist[oó]rico)\b/.test(
        c.raw,
      ) ||
      c.parsed.preferences.themes.some((t) =>
        /cultura|culture|patrimonio|museo/i.test(t),
      ),
  },
  {
    category: "transfers",
    priority: 3,
    match: (c) =>
      /\b(traslados?|transfer|recogida en el aeropuerto|coche con conductor|vtc|minib[uú]s)\b/.test(
        c.raw,
      ),
  },
];

/**
 * Devuelve las categorías a buscar, ordenadas. Máximo 2 por cotización:
 * más consultas encarecen y el agente no lee más de dos bloques.
 */
export function detectCategories(ctx: DetectionContext): ProviderCategory[] {
  const hits = SIGNALS.filter((s) => s.match(ctx)).sort(
    (a, b) => a.priority - b.priority,
  );
  const cats = hits.map((h) => h.category);

  // Sin señal temática: receptivo general, que siempre aporta algo
  if (cats.length === 0) return ["dmc"];

  // La accesibilidad, si aparece, siempre va primera y nunca se descarta
  const out = cats.slice(0, 2);
  if (cats.includes("accessible") && !out.includes("accessible")) {
    out[0] = "accessible";
  }
  return out;
}

export const CATEGORY_ES: Record<ProviderCategory, string> = {
  accessible: "Turismo accesible",
  wine: "Enoturismo",
  gastronomy: "Gastronomía",
  adventure: "Aventura y naturaleza",
  nautical: "Náutica y buceo",
  culture: "Cultura y patrimonio",
  transfers: "Traslados",
  dmc: "Receptivo local",
};

export const CATEGORY_EN: Record<ProviderCategory, string> = {
  accessible: "Accessible travel",
  wine: "Wine tourism",
  gastronomy: "Gastronomy",
  adventure: "Adventure & nature",
  nautical: "Nautical & diving",
  culture: "Culture & heritage",
  transfers: "Transfers",
  dmc: "Local DMC",
};
