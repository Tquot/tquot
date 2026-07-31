import type { Hints } from "./pre-extract";

export function shouldCallModel(hints: Hints, text: string): boolean {
  const hasDestination = hints.places.length > 0;
  const hasPax = hints.adults != null;
  const hasDateSignal = hints.dates.length > 0;

  // Multi-destino: siempre al modelo. Las reglas no encadenan legs bien.
  if (hints.places.length > 1) return true;

  // Texto largo o con estructura: probablemente hay matices que las reglas pierden
  if (text.length > 400) return true;
  if (/\n.*\n/.test(text.trim())) return true; // 3+ líneas

  // Frases que indican condiciones que las reglas no capturan
  if (
    /\b(pero|salvo|excepto|prefer|si no|en caso de|aunque|ojo|importante)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  // Falta algo bloqueante: el modelo puede rescatarlo del contexto
  if (!hasDestination || !hasPax) return true;

  // Todo lo esencial está y el texto es simple: reglas + defaults bastan
  return !(hasDestination && hasPax && hasDateSignal);
}
