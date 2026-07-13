import type { BoardCode } from "@/lib/quote-engine/types";

/** UI español → Hotelbeds */
export const BOARD_ES_TO_HB: Record<string, BoardCode> = {
  SA: "RO",
  AD: "BB",
  MP: "HB",
  PC: "FB",
  TI: "AI",
};

/** Hotelbeds → chip corto + label */
export const BOARD_HB_TO_ES: Record<
  string,
  { code: string; label: string }
> = {
  RO: { code: "SA", label: "Solo alojamiento" },
  BB: { code: "AD", label: "Desayuno" },
  HB: { code: "MP", label: "Media pensión" },
  FB: { code: "PC", label: "Pensión completa" },
  AI: { code: "TI", label: "Todo incluido" },
};

export function normalizeBoardCode(code: string | undefined | null): BoardCode {
  if (!code) return "RO";
  const upper = code.toUpperCase();
  if (BOARD_ES_TO_HB[upper]) return BOARD_ES_TO_HB[upper]!;
  if (BOARD_HB_TO_ES[upper]) return upper;
  if (upper.startsWith("RO") || upper.startsWith("SA")) return "RO";
  if (upper.startsWith("BB") || upper.startsWith("AD")) return "BB";
  if (upper.startsWith("HB") || upper.startsWith("MP")) return "HB";
  if (upper.startsWith("FB") || upper.startsWith("PC")) return "FB";
  if (upper.startsWith("AI") || upper.startsWith("TI")) return "AI";
  return upper;
}

export function getBoardLabel(code: BoardCode): string {
  const normalized = normalizeBoardCode(code);
  return BOARD_HB_TO_ES[normalized]?.label ?? String(code);
}

export function getBoardShortCode(code: BoardCode): string {
  const normalized = normalizeBoardCode(code);
  return BOARD_HB_TO_ES[normalized]?.code ?? String(code);
}
