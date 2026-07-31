import { z } from "zod";
import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { ParamChange } from "@/lib/agent/invalidation";
import { classifyByRules } from "@/lib/agent/intent";
import { client, CLAUDE_MODEL } from "./anthropic-client";
import { sanitize } from "./sanitize";
import { preExtract } from "./pre-extract";
import { normalizePlace } from "./destinations";

const PATCH_SYSTEM = `Recibes una cotización de viaje ya parseada y un mensaje nuevo del cliente. Devuelves SOLO los campos que cambian, como JSON array de cambios.

Formato: [{"field":"nights","value":5},{"field":"board","value":"MP"}]

Campos válidos: nights, arrivalDate, departureDate, adults, children, destination, origin, category, board, budget, area.

Si el mensaje no cambia nada de la cotización (es una pregunta, un agradecimiento, un comentario), devuelve [].
No repitas campos que no cambian. No inventes.`;

const PatchSchema = z.array(
  z.object({
    field: z.enum([
      "nights",
      "arrivalDate",
      "departureDate",
      "adults",
      "children",
      "destination",
      "origin",
      "category",
      "board",
      "budget",
      "area",
      "dates",
    ]),
    value: z.unknown(),
  }),
);

/**
 * Parsea un mensaje adicional como PATCH sobre el parsed existente,
 * no como una petición nueva. Ahorra tokens y evita perder datos
 * del primer mensaje que el segundo no repite.
 */
export async function parseFollowUp(
  raw: string,
  current: ParsedTripInputV2,
  _ctx?: { agencyDefaultOrigin: string },
): Promise<{ changes: ParamChange[]; isNewQuote: boolean }> {
  const { clean } = sanitize(raw);

  const hints = preExtract(clean);
  const mentionsNewDestination = hints.places.some(
    (p) => !current.legs.some((l) => sameCity(l.destination, p.name)),
  );
  const isNewQuote =
    mentionsNewDestination &&
    hints.places.length > 0 &&
    hints.adults != null;

  if (isNewQuote) return { changes: [], isNewQuote: true };

  const byRules = classifyByRules(clean);
  if (byRules?.type === "revise_params") {
    return { changes: byRules.changes, isNewQuote: false };
  }

  // Heurísticas baratas antes del modelo
  const ruleChanges = extractFollowUpByRules(clean, hints);
  if (ruleChanges.length > 0) {
    return { changes: ruleChanges, isNewQuote: false };
  }

  const changes = await modelPatch(clean, current);
  return { changes, isNewQuote: false };
}

function extractFollowUpByRules(
  clean: string,
  hints: ReturnType<typeof preExtract>,
): ParamChange[] {
  const changes: ParamChange[] = [];
  const t = clean.toLowerCase();

  // "prefieren el 15" / "el 15 mejor"
  const dayOnly = t.match(
    /\b(?:el|para el|mejor el|prefieren? el)\s*(\d{1,2})\b/,
  );
  if (dayOnly && hints.dates.length === 0) {
    // Caller must resolve against current month; leave as signal via nights/dates heuristics
  }

  if (hints.nights) {
    changes.push({ field: "nights", value: hints.nights.value });
  }
  if (hints.board) {
    changes.push({ field: "board", value: hints.board.code });
  }
  if (hints.category) {
    changes.push({ field: "category", value: hints.category.stars });
  }
  if (hints.adults) {
    changes.push({ field: "adults", value: hints.adults.value });
  }
  if (hints.dates[0]?.from && hints.dates[0]?.to) {
    changes.push({
      field: "dates",
      value: {
        arrivalDate: hints.dates[0].from,
        departureDate: hints.dates[0].to,
      },
    });
  }
  if (hints.budget) {
    changes.push({
      field: "budget",
      value: {
        amount: hints.budget.amount,
        currency: hints.budget.currency,
        per: hints.budget.per,
      },
    });
  }

  return changes;
}

async function modelPatch(
  clean: string,
  current: ParsedTripInputV2,
): Promise<ParamChange[]> {
  try {
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system: PATCH_SYSTEM,
      messages: [
        {
          role: "user",
          content: `COTIZACIÓN ACTUAL:
${JSON.stringify({
  legs: current.legs.map((l) => ({
    origin: l.origin,
    destination: l.destination,
    arrivalDate: l.arrivalDate,
    departureDate: l.departureDate,
  })),
  travelers: current.travelers,
  budget: current.budget,
})}

MENSAJE NUEVO:
${clean}`,
        },
      ],
    });

    const text =
      res.content.find((c) => c.type === "text")?.text ?? "";
    const jsonText = text.replace(/```json\n?|```/g, "").trim();
    const parsed = PatchSchema.parse(JSON.parse(jsonText));
    return parsed.map((p) => ({
      field: p.field === "dates" ? "dates" : p.field,
      value: p.value,
    })) as ParamChange[];
  } catch {
    return [];
  }
}

function sameCity(a: string, b: string): boolean {
  return normalizePlace(a) === normalizePlace(b);
}
