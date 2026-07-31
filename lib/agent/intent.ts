import type { SectionKey } from "./invalidation";
import type { ParamChange } from "./invalidation";

export type Intent =
  | { type: "revise_params"; changes: ParamChange[] }
  | { type: "swap_selection"; section: SectionKey; hint: string }
  | { type: "remove_section"; section: SectionKey }
  | { type: "add_section"; section: SectionKey }
  | { type: "question" }
  | { type: "new_quote" }
  | { type: "unknown" };

function normalizeSection(raw: string): SectionKey | null {
  const s = raw.toLowerCase();
  if (/vuelos?|flight/.test(s)) return "flights";
  if (/hotel/.test(s)) return "hotels";
  if (/actividad|excursion|experience/.test(s)) return "experiences";
  if (/traslado|transfer/.test(s)) return "transfers";
  if (/seguro|insurance/.test(s)) return "insurance";
  return null;
}

function normalizeBoard(raw: string): string {
  const s = raw.toLowerCase();
  if (s === "sa" || s.includes("solo aloj")) return "RO";
  if (s === "ad" || s.includes("desayuno")) return "BB";
  if (s === "mp" || s.includes("media pensi")) return "HB";
  if (s === "pc" || s.includes("pensi") && s.includes("completa")) return "FB";
  if (s.includes("todo incluido") || s === "ti" || s === "ai") return "AI";
  return raw.toUpperCase();
}

/**
 * Clasificador por reglas. Cubre ~75 % de los mensajes de revisión reales
 * sin gastar un token. Devuelve null si no está seguro.
 */
export function classifyByRules(message: string): Intent | null {
  const m = message.toLowerCase().trim();

  const removeMatch = m.match(
    /\b(quita|elimina|sin|fuera|no quiero|olvida)\s+(el\s+|los\s+|las\s+|la\s+)?(vuelos?|hotel(es)?|actividad(es)?|excursion(es)?|traslados?|transfers?|seguro)/,
  );
  if (removeMatch?.[3]) {
    const section = normalizeSection(removeMatch[3]);
    if (section) return { type: "remove_section", section };
  }

  const addMatch = m.match(
    /\b(añade|agrega|pon|incluye|mete|suma)\s+(el\s+|un\s+|una\s+)?(vuelos?|hotel(es)?|actividad(es)?|traslados?|transfers?|seguro)/,
  );
  if (addMatch?.[3]) {
    const section = normalizeSection(addMatch[3]);
    if (section) return { type: "add_section", section };
  }

  const nightsMatch = m.match(/\b(\d{1,2})\s*noches?\b/);
  if (nightsMatch?.[1] && /\b(mejor|cambia|pon|en vez|realmente|son)\b/.test(m)) {
    return {
      type: "revise_params",
      changes: [{ field: "nights", value: parseInt(nightsMatch[1], 10) }],
    };
  }

  const paxMatch = m.match(/\b(\d{1,2})\s*(adultos?|personas?|pax)\b/);
  if (paxMatch?.[1] && /\b(mejor|cambia|pon|en vez|somos|son)\b/.test(m)) {
    return {
      type: "revise_params",
      changes: [{ field: "adults", value: parseInt(paxMatch[1], 10) }],
    };
  }

  const boardMatch = m.match(
    /\b(sa|ad|mp|pc|solo alojamiento|desayuno|media pensi[oó]n|pensi[oó]n completa|todo incluido)\b/,
  );
  if (boardMatch?.[1] && /\b(mejor|cambia|pon|en|quiero)\b/.test(m)) {
    return {
      type: "revise_params",
      changes: [{ field: "board", value: normalizeBoard(boardMatch[1]) }],
    };
  }

  const starsMatch = m.match(/\b([345])\s*(estrellas?|\*)/);
  if (starsMatch?.[1]) {
    return {
      type: "revise_params",
      changes: [{ field: "category", value: parseInt(starsMatch[1], 10) }],
    };
  }

  if (
    /\b(el|la)\s+(primero|segundo|tercero|m[aá]s barato|m[aá]s caro|otro|siguiente)\b/.test(
      m,
    )
  ) {
    const section: SectionKey = /hotel/.test(m)
      ? "hotels"
      : /vuelo/.test(m)
        ? "flights"
        : "hotels";
    return { type: "swap_selection", section, hint: m };
  }

  if (
    /\b(nueva cotizaci[oó]n|otra cotizaci[oó]n|empieza de nuevo|desde cero)\b/.test(
      m,
    )
  ) {
    return { type: "new_quote" };
  }

  if (m.endsWith("?") && !/\bcambia|pon|quita\b/.test(m)) {
    return { type: "question" };
  }

  return null;
}

/** Fallback cuando las reglas no bastan: desconocido (caller puede llamar a Haiku). */
export function classifyIntent(message: string): Intent {
  return classifyByRules(message) ?? { type: "unknown" };
}
