import Anthropic from "@anthropic-ai/sdk";
import type { CloseFacts } from "./types";
import { tplCloseWithNote } from "./templates";
import { hasBannedLexicon } from "./lexicon";

const SYSTEM = `Eres el agente de TQuot. Hablas con un agente de viajes profesional español con años de oficio.

Reglas:
- Máximo 240 caracteres. Cuenta los caracteres.
- Español de España. Nunca latino neutro.
- Cifras concretas siempre. Nunca "varias opciones" ni "algunos hoteles".
- Prohibido: signos de exclamación, "perfecto", "genial", "entendido", "espero que", ofrecerte a ayudar más.
- No narres tu proceso. No digas que has buscado ni que has terminado.
- Usa jerga del sector sin explicarla: neto, pax, SA/AD/MP/PC, escala, directo, deadline.
- Empieza por el dato, no por el contexto.
- Cierra con un hecho útil o una pregunta cerrada de dos opciones. Nunca con una pregunta abierta.

Recibes hechos ya verificados. Solo los redactas. No inventes datos que no estén en los hechos.`;

const FEW_SHOT = [
  {
    role: "user" as const,
    content: `Hechos:
- total: 2847 EUR, 2 pax
- vuelo elegido: FR 68 EUR, aterriza en CIA
- hotel elegido: Hotel Vilòn, 268 EUR/noche
- nota: CIA (Ciampino) está a 45 min del centro; FCO a 32 min en tren
- nota: el Vilòn no es reembolsable`,
  },
  {
    role: "assistant" as const,
    content:
      "Total 2 pax: 2 847 €. Ojo con dos cosas: el FR aterriza en Ciampino, 45 min al centro, y el Vilòn no es reembolsable. ¿Te paso las alternativas con FCO?",
  },
  {
    role: "user" as const,
    content: `Hechos:
- total: 4120 EUR, 4 pax (2 adultos, 2 niños de 6 y 9)
- hotel elegido: H10 Rubicón Palace, 187 EUR/noche, todo incluido
- nota: el niño de 9 cumple 10 durante el viaje, la tarifa de menor puede cambiar
- nota: deadline de cancelación en 6 días`,
  },
  {
    role: "assistant" as const,
    content:
      "Total 4 pax: 4 120 €. El de 9 cumple 10 durante el viaje, revisa la tarifa de menor antes de confirmar. Deadline de cancelación en 6 días.",
  },
];

export async function narrateClose(facts: CloseFacts): Promise<string> {
  const factLines = [
    `- total: ${Math.round(facts.totalPrice)} ${facts.currency}, ${facts.pax} pax`,
    facts.topFlight &&
      `- vuelo elegido: ${facts.topFlight.carrier} ${facts.topFlight.price} EUR`,
    facts.topHotel &&
      `- hotel elegido: ${facts.topHotel.name}, ${facts.topHotel.netPrice} EUR/noche`,
    ...facts.notes.map((n) => `- nota: ${n}`),
  ]
    .filter(Boolean)
    .join("\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return tplCloseWithNote(facts);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: SYSTEM,
      messages: [
        ...FEW_SHOT,
        { role: "user", content: `Hechos:\n${factLines}` },
      ],
    });

    const text =
      res.content.find((c) => c.type === "text")?.text?.trim() ?? "";

    if (!text || text.length > 240 || hasBannedLexicon(text)) {
      return tplCloseWithNote(facts);
    }
    return text;
  } catch {
    return tplCloseWithNote(facts);
  }
}
