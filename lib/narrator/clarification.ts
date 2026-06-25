import type { ParsedTripInputV2, ParsingGap } from "@/lib/quote-engine/schemas-v2";

type GapMessageBuilder = (parsed: ParsedTripInputV2) => string;

const GAP_MESSAGES: Record<ParsingGap, GapMessageBuilder> = {
  missing_origin: () =>
    "No me dijiste desde dónde sale el cliente. Voy a buscar suponiendo salida desde Madrid; si es otra ciudad avísame.",

  missing_dates: () =>
    "No me quedaron claras las fechas exactas. Voy a buscar para el mes que viene como referencia, pero confírmamelas para afinar precios.",

  missing_return_date: (p) =>
    `Tengo la fecha de ida pero no la de vuelta. Asumo ${defaultDurationFor(p)} y ajusto luego si hace falta.`,

  missing_pax_count: () =>
    "No me dijiste cuántas personas viajan. Asumo 2 adultos por defecto.",

  missing_children_ages: (p) => {
    const n = p.travelers.children.length;
    return `Tengo ${n} ${n === 1 ? "niño" : "niños"} pero sin edades exactas. Estimo 10 años; si las sabes, dímelo para precios correctos (especialmente en vuelos).`;
  },

  ambiguous_destination: (p) => {
    const dest = p.legs[0]?.destination ?? "el destino";
    return `"${dest}" puede referirse a varios sitios. Interpreto el más común; si quieres otro avísame.`;
  },

  unclear_budget: () =>
    "No tengo un presupuesto claro. Te muestro un abanico mid-range; desde ahí lo movemos.",

  unclear_dates_relative: () =>
    'Las fechas son relativas ("el mes que viene"). Busco para esa horquilla; si tienes fechas exactas mejor.',
};

function defaultDurationFor(p: ParsedTripInputV2): string {
  const totalNights = p.legs.reduce((sum, leg) => {
    const arr = new Date(leg.arrivalDate);
    const dep = new Date(leg.departureDate);
    const nights = Math.round((dep.getTime() - arr.getTime()) / 86_400_000);
    return sum + Math.max(0, nights);
  }, 0);
  return totalNights > 0 ? `${totalNights} noches` : "3 noches";
}

/**
 * Devuelve los mensajes que el narrador debe emitir para informar al agente
 * sobre los gaps detectados en el parseado.
 */
export function buildClarificationMessages(parsed: ParsedTripInputV2): string[] {
  return parsed.parsingGaps
    .map((gap) => GAP_MESSAGES[gap]?.(parsed))
    .filter((m): m is string => Boolean(m));
}
