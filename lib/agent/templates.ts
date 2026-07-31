import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { CloseFacts, RevisionKind } from "./types";
import { fmtAmount, legNights } from "./format";

/**
 * Toda plantilla es una función pura: datos → string.
 * Ninguna llama al modelo. Ninguna supera su MAX_CHARS.
 */

export function tplAck(parsed: ParsedTripInputV2): string {
  const legs = parsed.legs;
  const { adults, children } = parsed.travelers;
  const pax =
    children.length > 0
      ? `${adults} adultos, ${children.length} ${children.length === 1 ? "niño" : "niños"}`
      : `${adults} adultos`;

  if (legs.length > 1) {
    const names = legs.map((l) => l.destination).join(" · ");
    const totalNights = legs.reduce(
      (s, l) => s + legNights(l.arrivalDate, l.departureDate),
      0,
    );
    return `${names}. ${totalNights} noches, ${pax}. Voy.`;
  }

  const leg = legs[0]!;
  const nights = legNights(leg.arrivalDate, leg.departureDate);
  const areaHint =
    leg.legPreferences?.locationLandmarks?.[0] ??
    parsed.preferences.locationLandmarks?.[0];
  const area = areaHint ? ` Zona ${areaHint}.` : "";
  return `${leg.destination}, ${nights} noches, ${pax}.${area} Voy.`;
}

export function tplRevisionAck(
  kind: RevisionKind,
  detail: string,
  rebuilding: string[],
): string {
  const what =
    rebuilding.length > 0
      ? ` Rehago ${rebuilding.map(sectionEs).join(" y ")}.`
      : "";

  const head: Record<RevisionKind, string> = {
    nights: `${detail}.`,
    dates: `${detail}.`,
    pax: `${detail}.`,
    destination: `${detail}.`,
    board: `${detail}.`,
    category: `${detail}.`,
    budget: `Presupuesto ${detail}.`,
    remove_section: `Fuera ${detail}.`,
    add_section: `Añado ${detail}.`,
    swap_selection: `Cambiado a ${detail}.`,
  };

  return `${head[kind]}${what}`;
}

export function sectionEs(key: string): string {
  return (
    (
      {
        flights: "vuelos",
        flightsReturn: "vuelos",
        hotels: "hoteles",
        experiences: "actividades",
        transfers: "traslados",
        insurance: "seguro",
      } as Record<string, string>
    )[key] ?? key
  );
}

/** Cierre sin nada destacable: plantilla pura, cero tokens. */
export function tplClosePlain(f: CloseFacts): string {
  const parts: string[] = [];
  if (f.topFlight) {
    parts.push(`Vuelo ${f.topFlight.carrier} ${fmtAmount(f.topFlight.price)} €`);
  }
  if (f.topHotel) {
    parts.push(`${f.topHotel.name} a ${fmtAmount(f.topHotel.netPrice)} €/noche`);
  }
  const head = parts.length > 0 ? `${parts.join(", ")}. ` : "";
  return `${head}Total ${f.pax} pax: ${fmtAmount(f.totalPrice)} ${f.currency}.`;
}

/** Con un solo hecho notable, todavía cabe plantilla. */
export function tplCloseWithNote(f: CloseFacts): string {
  const base = tplClosePlain(f);
  const note = f.notes[0];
  if (!note) return base;
  const candidate = `${base} ${note}`;
  return candidate.length <= 240 ? candidate : base;
}

export function tplBlocker(
  provider: string,
  available: string[],
  retryable: boolean,
): string {
  const alt =
    available.length > 0 ? ` Tienes ${available.join(" y ")}.` : "";
  const retry = retryable ? " Reintento en un momento." : "";
  return `${provider} no responde.${alt}${retry}`;
}

export function tplNoResults(section: string, hint: string | null): string {
  const h = hint ? ` ${hint}` : "";
  return `Sin resultados en ${sectionEs(section)}.${h}`;
}

export function tplFindingFlights(
  count: number,
  route: string,
  note?: string,
): string {
  const base =
    count === 1
      ? `1 vuelo ${route}.`
      : `${count} vuelos ${route}.`;
  if (!note) return base;
  const candidate = `${base} ${note}`;
  return candidate.length <= 100 ? candidate : base;
}

export function tplFindingHotels(
  count: number,
  area: string | null,
  note?: string,
): string {
  const where = area ? ` en ${area}` : "";
  const base = `${count} hoteles${where}.`;
  if (!note) return base;
  const candidate = `${base} ${note}`;
  return candidate.length <= 100 ? candidate : base;
}
