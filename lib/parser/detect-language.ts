export type InputLanguageHint = "es" | "en";

/**
 * Heuristic es/en detection from agent free text.
 * Returns undefined when signal is too weak (model infers from content).
 */
export function detectInputLanguage(text: string): InputLanguageHint | undefined {
  const sample = text.trim().slice(0, 2500).toLowerCase();
  if (!sample) return undefined;

  const spanishHits = (
    sample.match(
      /\b(el|la|los|las|de|del|para|con|viaje|vuelo|hotel|noches|adultos|niños|desde|hasta|españa|quiero|necesito|cotización|solicitud)\b/gi,
    ) ?? []
  ).length;
  const englishHits = (
    sample.match(
      /\b(the|and|for|with|trip|flight|hotel|nights|adults|children|from|to|need|want|travel|quote|request)\b/gi,
    ) ?? []
  ).length;

  if (spanishHits > englishHits && spanishHits >= 2) return "es";
  if (englishHits > spanishHits && englishHits >= 2) return "en";
  if (spanishHits >= 3) return "es";
  if (englishHits >= 3) return "en";
  return undefined;
}

export function languageInstructionForPrompt(
  languageHint?: InputLanguageHint,
): string {
  if (languageHint === "es") {
    return 'Idioma del agente: español. Escribe todas las preguntas en "questions" en español.';
  }
  if (languageHint === "en") {
    return 'Agent language: English. Write every string in "questions" in English.';
  }
  return 'Detecta el idioma del texto del agente y escribe todas las preguntas en "questions" en ese mismo idioma.';
}
