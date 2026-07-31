/** Léxico prohibido — fuente única para prompts, guardas y tests. */
export const BANNED_LEXICON_PATTERN =
  /\b(perfecto|genial|entendido|por supuesto|no hay problema|espero que|estoy aquí|voy a buscar|estoy buscando|he terminado|déjame consultar|permíteme|claro que sí|encantado de|como asistente|a continuación|¡listo)\b|!/i;

export function hasBannedLexicon(text: string): boolean {
  return BANNED_LEXICON_PATTERN.test(text);
}
