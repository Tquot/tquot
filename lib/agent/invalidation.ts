export type SectionKey =
  | "flights"
  | "flightsReturn"
  | "hotels"
  | "experiences"
  | "transfers"
  | "insurance";

export type ParamChangeField =
  | "nights"
  | "dates"
  | "adults"
  | "children"
  | "destination"
  | "origin"
  | "category"
  | "board"
  | "budget"
  | "area"
  | "arrivalDate"
  | "departureDate";

export interface ParamChange {
  field: ParamChangeField;
  value: unknown;
  legId?: string;
}

type Action = "rebuild" | "recalculate" | "localPrice" | "none";

const MATRIX: Record<string, Partial<Record<SectionKey, Action>>> = {
  nights: {
    flightsReturn: "rebuild",
    hotels: "rebuild",
    insurance: "recalculate",
  },
  dates: {
    flights: "rebuild",
    flightsReturn: "rebuild",
    hotels: "rebuild",
    experiences: "rebuild",
    transfers: "rebuild",
    insurance: "recalculate",
  },
  arrivalDate: {
    flights: "rebuild",
    hotels: "rebuild",
    experiences: "rebuild",
    transfers: "rebuild",
    insurance: "recalculate",
  },
  departureDate: {
    flightsReturn: "rebuild",
    hotels: "rebuild",
    transfers: "rebuild",
    insurance: "recalculate",
  },
  adults: {
    flights: "rebuild",
    flightsReturn: "rebuild",
    hotels: "rebuild",
    experiences: "rebuild",
    transfers: "rebuild",
    insurance: "recalculate",
  },
  children: {
    flights: "rebuild",
    flightsReturn: "rebuild",
    hotels: "rebuild",
    experiences: "rebuild",
    transfers: "rebuild",
    insurance: "recalculate",
  },
  destination: {
    flights: "rebuild",
    flightsReturn: "rebuild",
    hotels: "rebuild",
    experiences: "rebuild",
    transfers: "rebuild",
    insurance: "recalculate",
  },
  origin: { flights: "rebuild", flightsReturn: "rebuild" },
  category: { hotels: "rebuild" },
  area: { hotels: "rebuild", transfers: "rebuild" },
  board: { hotels: "localPrice" },
  budget: {},
};

export function resolveInvalidation(changes: ParamChange[]): {
  rebuild: SectionKey[];
  recalculate: SectionKey[];
  localPrice: SectionKey[];
} {
  const rebuild = new Set<SectionKey>();
  const recalculate = new Set<SectionKey>();
  const localPrice = new Set<SectionKey>();

  for (const change of changes) {
    const row = MATRIX[change.field] ?? {};
    for (const [section, action] of Object.entries(row) as Array<
      [SectionKey, Action]
    >) {
      if (action === "rebuild") rebuild.add(section);
      else if (action === "recalculate") recalculate.add(section);
      else if (action === "localPrice") localPrice.add(section);
    }
  }

  for (const s of rebuild) {
    recalculate.delete(s);
    localPrice.delete(s);
  }

  return {
    rebuild: [...rebuild],
    recalculate: [...recalculate],
    localPrice: [...localPrice],
  };
}
