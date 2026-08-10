import { translations, type Locale } from "@/app/dashboard/translations";
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
  locale: Locale = "es",
): AgentMessage | null {
  const t = translations[locale];
  const gaps = parsed.parsingGaps ?? [];
  const blocking: BlockingField[] = [];

  if (gaps.includes("ambiguous_destination")) {
    blocking.push({
      field: "destination",
      question: t.probeDestination,
    });
  }
  if (gaps.includes("missing_pax_count")) {
    blocking.push({
      field: "travelers",
      question: t.probeTravelers,
      options: [
        { label: t.probeOpt2Adults, value: { adults: 2, children: [] } },
        {
          label: t.probeOpt2Adults2Children,
          value: { adults: 2, children: [{ age: 8 }, { age: 11 }] },
        },
        { label: t.probeOpt4Adults, value: { adults: 4, children: [] } },
      ],
    });
  }

  // Ambos → un solo mensaje
  if (blocking.length === 2) {
    return buildProbe([
      {
        field: "destination",
        question: t.probeDestinationAndTravelers,
        options: blocking[1].options,
      },
    ]);
  }

  return buildProbe(blocking);
}
