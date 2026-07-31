import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { AgentMessage } from "./types";
import { mkMessage } from "./message";
import { MAX_CHARS } from "./types";

/** Probe solo cuando hay gaps bloqueantes; plantilla corta. */
export function buildProbeIfNeeded(
  parsed: ParsedTripInputV2,
): AgentMessage | null {
  const gaps = parsed.parsingGaps ?? [];
  if (gaps.includes("missing_dates") || gaps.includes("unclear_dates_relative")) {
    const text = "¿Qué fechas exactas? Dame entrada y salida.";
    return mkMessage("probe", text.slice(0, MAX_CHARS.probe));
  }
  if (gaps.includes("missing_origin")) {
    return mkMessage("probe", "¿Desde qué ciudad salen?");
  }
  if (gaps.includes("missing_pax_count")) {
    return mkMessage("probe", "¿Cuántos adultos y menores?");
  }
  if (gaps.includes("ambiguous_destination")) {
    return mkMessage(
      "probe",
      "Destino ambiguo. ¿Ciudad concreta o zona?",
    );
  }
  return null;
}
