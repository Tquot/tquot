import { nanoid } from "nanoid";
import type {
  BudgetConstraint,
  ParsedTripInputV2,
  TravelPreferences,
} from "@/lib/quote-engine/schemas-v2";

export interface Assumption {
  field: string;
  label: string;
  value: unknown;
  reason: string;
  alternatives?: Array<{ label: string; value: unknown }>;
}

export interface BlockingField {
  field: "destination" | "travelers";
  question: string;
  options?: Array<{ label: string; value: unknown }>;
}

export type InformalBoardCode = "SA" | "AD" | "MP" | "PC" | "TI";

export interface MergedLeg {
  origin?: string | null;
  destination?: string | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
  nights?: number | null;
  monthHint?: { month: number; year: number } | null;
  preferences?: {
    hotelCategory?: number | null;
    area?: string | null;
    boardCode?: InformalBoardCode | null;
    beachfront?: boolean | null;
  };
}

export interface MergedParse {
  legs: MergedLeg[];
  travelers?: {
    adults?: number | null;
    children?: Array<{ age: number }>;
  } | null;
  budget?: {
    amount: number;
    currency: string;
    per: "person" | "total";
  } | null;
  tags?: string[];
  uncertain?: Record<string, string>;
  rawInput?: string;
}

const NIGHTS_BY_CONTEXT: Array<{
  when: (f: string[]) => boolean;
  nights: number;
  reason: string;
}> = [
  { when: (f) => f.includes("shortBreak"), nights: 3, reason: "escapada" },
  {
    when: (f) => f.includes("beach") || f.includes("allInclusive"),
    nights: 7,
    reason: "destino de playa",
  },
  { when: (f) => f.includes("honeymoon"), nights: 10, reason: "luna de miel" },
  { when: (f) => f.includes("central"), nights: 4, reason: "ciudad" },
];

const STARS_TO_TIER: Record<
  number,
  Extract<BudgetConstraint, { kind: "tier" }>["tier"]
> = {
  3: "budget",
  4: "premium",
  5: "luxury",
};

export function applyDefaults(
  merged: MergedParse,
  ctx: { defaultOrigin: string; flags: string[] },
): {
  parsed: ParsedTripInputV2;
  assumptions: Assumption[];
  blocking: BlockingField[];
} {
  const assumptions: Assumption[] = [];
  const blocking: BlockingField[] = [];

  if (!merged.legs?.[0]?.destination) {
    blocking.push({
      field: "destination",
      question: "¿A qué destino?",
    });
  }

  if (!merged.travelers?.adults) {
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

  const isGroup = ctx.flags.includes("group");

  const legs = (merged.legs ?? []).map((leg, i) => {
    const out: MergedLeg = {
      ...leg,
      preferences: { ...leg.preferences },
    };

    if (i === 0 && !out.origin) {
      out.origin = ctx.defaultOrigin;
      assumptions.push({
        field: `legs.0.origin`,
        label: `desde ${ctx.defaultOrigin}`,
        value: ctx.defaultOrigin,
        reason: "origen habitual de tu agencia",
      });
    }
    if (i > 0 && !out.origin) {
      out.origin = merged.legs![i - 1]?.destination ?? ctx.defaultOrigin;
    }

    if (!out.nights) {
      const rule = NIGHTS_BY_CONTEXT.find((r) => r.when(ctx.flags));
      const nights = rule?.nights ?? 4;
      out.nights = nights;
      assumptions.push({
        field: `legs.${i}.nights`,
        label: `${nights} noches`,
        value: nights,
        reason: rule?.reason ?? "duración media",
        alternatives: [3, 5, 7, 10, 14]
          .filter((n) => n !== nights)
          .map((n) => ({ label: `${n} noches`, value: n })),
      });
    }

    if (!out.arrivalDate && out.monthHint) {
      const start = isGroup
        ? firstMondayOf(out.monthHint.year, out.monthHint.month)
        : firstSaturdayOf(out.monthHint.year, out.monthHint.month);
      const end = addDays(start, out.nights!);
      out.arrivalDate = start;
      out.departureDate = end;
      assumptions.push({
        field: `legs.${i}.dates`,
        label: formatRange(start, end),
        value: { arrivalDate: start, departureDate: end },
        reason: isGroup
          ? "inicio de semana (grupo/empresa)"
          : "primer fin de semana del mes",
        alternatives: saturdaysOf(out.monthHint.year, out.monthHint.month)
          .filter((s) => s !== start)
          .slice(0, 4)
          .map((s) => ({
            label: formatRange(s, addDays(s, out.nights!)),
            value: {
              arrivalDate: s,
              departureDate: addDays(s, out.nights!),
            },
          })),
      });
    }

    if (!out.preferences?.hotelCategory) {
      out.preferences = { ...out.preferences, hotelCategory: 4 };
      assumptions.push({
        field: `legs.${i}.preferences.hotelCategory`,
        label: "4 estrellas",
        value: 4,
        reason: "categoría más cotizada",
        alternatives: [3, 5].map((s) => ({
          label: `${s} estrellas`,
          value: s,
        })),
      });
    }

    if (!out.preferences?.boardCode) {
      const isResort =
        ctx.flags.includes("allInclusive") || ctx.flags.includes("beach");
      const code: InformalBoardCode = isResort ? "TI" : "AD";
      out.preferences = { ...out.preferences, boardCode: code };
      assumptions.push({
        field: `legs.${i}.preferences.boardCode`,
        label: code === "TI" ? "todo incluido" : "con desayuno",
        value: code,
        reason: isResort
          ? "lo habitual en destino de playa"
          : "lo más vendido",
        alternatives: (["SA", "AD", "MP", "PC", "TI"] as const)
          .filter((c) => c !== code)
          .map((c) => ({ label: boardLabel(c), value: c })),
      });
    }

    if (
      ctx.flags.includes("beach") &&
      out.preferences?.beachfront == null
    ) {
      out.preferences = { ...out.preferences, beachfront: true };
    }

    return out;
  });

  return {
    parsed: buildParsedV2(legs, merged.travelers, merged.budget, merged.tags, {
      rawInput: merged.rawInput ?? "",
      flags: ctx.flags,
      blocking,
    }),
    assumptions,
    blocking,
  };
}

function boardLabel(code: InformalBoardCode): string {
  const map: Record<InformalBoardCode, string> = {
    SA: "solo alojamiento",
    AD: "con desayuno",
    MP: "media pensión",
    PC: "pensión completa",
    TI: "todo incluido",
  };
  return map[code];
}

export function buildParsedV2(
  legs: MergedLeg[],
  travelers: MergedParse["travelers"],
  budget: MergedParse["budget"],
  tags: string[] | undefined,
  extras: {
    rawInput: string;
    flags: string[];
    blocking: BlockingField[];
  },
): ParsedTripInputV2 {
  const adults = travelers?.adults && travelers.adults > 0 ? travelers.adults : 2;
  const children = travelers?.children ?? [];

  const stars = legs[0]?.preferences?.hotelCategory ?? 4;
  const budgetConstraint: BudgetConstraint = budget
    ? {
        kind: "exact",
        amount: budget.amount,
        currency: budget.currency.length === 3 ? budget.currency : "EUR",
        perPerson: budget.per === "person",
      }
    : { kind: "tier", tier: STARS_TO_TIER[stars] ?? "premium" };

  const locationPriorities: TravelPreferences["locationPriorities"] = [];
  if (legs.some((l) => l.preferences?.beachfront) || extras.flags.includes("beach")) {
    locationPriorities.push("beach");
  }
  if (extras.flags.includes("central")) {
    locationPriorities.push("central");
  }

  const themes = [...(tags ?? [])];
  for (const f of extras.flags) {
    if (!themes.includes(f)) themes.push(f);
  }
  const board = legs[0]?.preferences?.boardCode;
  if (board) themes.push(`board:${board}`);

  const parsingGaps: ParsedTripInputV2["parsingGaps"] = [];
  if (extras.blocking.some((b) => b.field === "destination")) {
    parsingGaps.push("ambiguous_destination");
  }
  if (extras.blocking.some((b) => b.field === "travelers")) {
    parsingGaps.push("missing_pax_count");
  }
  if (children.some((c) => c.age == null)) {
    parsingGaps.push("missing_children_ages");
  }

  const now = new Date();
  const fallbackStart = firstSaturdayOf(now.getFullYear(), now.getMonth() + 1);

  return {
    version: 2,
    travelers: {
      adults,
      children: children.map((c) => ({ age: c.age })),
      infants: 0,
    },
    legs: legs.map((leg, i) => {
      const nights = leg.nights ?? 4;
      const arrival =
        leg.arrivalDate ??
        (leg.monthHint
          ? firstSaturdayOf(leg.monthHint.year, leg.monthHint.month)
          : fallbackStart);
      const departure = leg.departureDate ?? addDays(arrival, nights);
      const dest = leg.destination?.trim() || "Destino";

      return {
        id: nanoid(),
        order: i,
        origin: leg.origin ?? undefined,
        destination: dest,
        arrivalDate: arrival,
        departureDate: departure,
        needsAccommodation: true,
        needsTransport: "flight" as const,
        legPreferences: {
          hotelStyles: [],
          locationPriorities:
            leg.preferences?.beachfront ? (["beach"] as const) : [],
          locationLandmarks: leg.preferences?.area
            ? [leg.preferences.area]
            : [],
          themes: [],
          amenities: [],
          accessibility: extras.flags.includes("accessible")
            ? ["wheelchair_accessible"]
            : [],
        },
      };
    }),
    budget: budgetConstraint,
    preferences: {
      hotelStyles: [],
      locationPriorities,
      locationLandmarks: [],
      themes,
      amenities: [],
      accessibility: extras.flags.includes("accessible")
        ? ["wheelchair_accessible"]
        : [],
      ...(extras.flags.includes("family")
        ? { audience: "family" as const }
        : extras.flags.includes("honeymoon")
          ? { audience: "couples" as const }
          : {}),
    },
    notes: board ? `Régimen preferido: ${boardLabel(board)}` : undefined,
    rawInput: extras.rawInput,
    parsingGaps,
  };
}

/** Los viajes de ocio españoles empiezan en sábado con mucha frecuencia. */
export function firstSaturdayOf(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return toIsoLocal(d);
}

export function firstMondayOf(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return toIsoLocal(d);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoLocal(d);
}

export function saturdaysOf(year: number, month: number): string[] {
  const result: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === 6) result.push(toIsoLocal(d));
    d.setDate(d.getDate() + 1);
  }
  return result;
}

export function formatRange(from: string, to: string): string {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${months[a.getMonth()]}`;
  }
  return `${a.getDate()} ${months[a.getMonth()]} – ${b.getDate()} ${months[b.getMonth()]}`;
}

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
