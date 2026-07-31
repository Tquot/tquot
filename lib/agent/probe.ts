import type { BlockingField } from "@/lib/parser/defaults";
import type { AgentAction, AgentMessage } from "./types";
import { mkMessage } from "./message";
import { MAX_CHARS } from "./types";
import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";

/**
 * Probe solo cuando faltan bloqueantes (destino / viajeros).
 * Un solo mensaje, máx 2 preguntas. Opciones tocables si las hay.
 */
export function buildProbe(blocking: BlockingField[]): AgentMessage | null {
  if (blocking.length === 0) return null;

  const picked = blocking.slice(0, 2);
  const text = picked.map((b) => b.question).join(" ");

  const first = picked[0];
  const actions: AgentAction[] = (first.options ?? []).map((o, i) => ({
    id: `probe-${i}`,
    label: o.label,
    variant: i === 0 ? "primary" : "ghost",
    patch: { type: "setField", field: first.field, value: o.value },
  }));

  return {
    ...mkMessage("probe", text.slice(0, MAX_CHARS.probe), {
      actions: actions.length > 0 ? actions : undefined,
    }),
  };
}

/**
 * Compat con el planner: deriva bloqueantes de parsingGaps v2.
 * Ya no pregunta fechas ni origen (son asunciones editables).
 */
export function buildProbeIfNeeded(
  parsed: ParsedTripInputV2,
): AgentMessage | null {
  const gaps = parsed.parsingGaps ?? [];
  const blocking: BlockingField[] = [];

  if (gaps.includes("ambiguous_destination")) {
    blocking.push({
      field: "destination",
      question: "¿A qué destino?",
    });
  }
  if (gaps.includes("missing_pax_count")) {
    blocking.push({
      field: "travelers",
      question: "¿Cuántos viajan?",
      options: [
        { label: "2 adultos", value: { adults: 2, children: [] } },
        {
          label: "2 adultos + 2 niños",
          value: { adults: 2, children: [{ age: 8 }, { age: 11 }] },
        },
        { label: "4 adultos", value: { adults: 4, children: [] } },
      ],
    });
  }

  // Ambos → un solo mensaje
  if (blocking.length === 2) {
    return buildProbe([
      {
        field: "destination",
        question: "¿A qué destino y cuántos viajan?",
        options: blocking[1].options,
      },
    ]);
  }

  return buildProbe(blocking);
}
