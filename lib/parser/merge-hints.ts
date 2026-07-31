import type { Hints } from "./pre-extract";
import type { InformalBoardCode, MergedParse } from "./defaults";

/** Output intermedio del modelo (Paso 3). */
export interface ModelParseOutput {
  legs: Array<{
    origin: string | null;
    destination: string;
    arrivalDate: string | null;
    departureDate: string | null;
    nights: number | null;
    preferences: {
      hotelCategory: number | null;
      area: string | null;
      boardCode: InformalBoardCode | null;
      beachfront: boolean | null;
    };
  }>;
  travelers: {
    adults: number;
    children: Array<{ age: number }>;
  };
  budget: {
    amount: number;
    currency: string;
    per: "person" | "total";
  } | null;
  tags: string[];
  uncertain: Record<string, string>;
}

/**
 * Fusionar: hints tienen prioridad sobre el modelo en fechas y números,
 * el modelo tiene prioridad en destino, zona y matices.
 */
export function merge(
  hints: Hints,
  model: ModelParseOutput | null,
  rawInput = "",
): MergedParse {
  if (!model) {
    return mergeFromHintsOnly(hints, rawInput);
  }

  const dateHint = hints.dates[0];
  const legs = model.legs.map((leg, i) => {
    const nights =
      hints.nights?.value ??
      leg.nights ??
      (dateHint?.from && dateHint?.to
        ? nightsBetween(dateHint.from, dateHint.to)
        : null);

    let arrivalDate = leg.arrivalDate;
    let departureDate = leg.departureDate;
    if (dateHint?.from && dateHint?.to && i === 0) {
      arrivalDate = dateHint.from;
      departureDate = dateHint.to;
    }

    const monthHint =
      !arrivalDate && dateHint?.month != null && dateHint?.year != null
        ? { month: dateHint.month, year: dateHint.year }
        : null;

    const destination =
      leg.destination ||
      hints.places[i]?.name ||
      hints.places[0]?.name ||
      null;

    return {
      origin: leg.origin,
      destination,
      arrivalDate,
      departureDate,
      nights,
      monthHint,
      preferences: {
        hotelCategory:
          hints.category?.stars ?? leg.preferences.hotelCategory,
        area: leg.preferences.area,
        boardCode: (hints.board?.code as InformalBoardCode | undefined) ??
          leg.preferences.boardCode,
        beachfront:
          hints.flags.includes("beach")
            ? true
            : leg.preferences.beachfront,
      },
    };
  });

  // Si el modelo no devolvió legs pero hay places, crear uno
  if (legs.length === 0 && hints.places.length > 0) {
    return mergeFromHintsOnly(hints, rawInput);
  }

  const adults = hints.adults?.value ?? model.travelers.adults;
  const children =
    hints.children?.ages.length
      ? hints.children.ages.map((age) => ({ age }))
      : hints.children?.count
        ? Array.from({ length: hints.children.count }, () => ({ age: 10 }))
        : model.travelers.children;

  const budget = hints.budget
    ? {
        amount: hints.budget.amount,
        currency: hints.budget.currency,
        per: hints.budget.per,
      }
    : model.budget;

  return {
    legs,
    travelers: { adults, children },
    budget,
    tags: [...new Set([...model.tags, ...hints.flags])],
    uncertain: model.uncertain,
    rawInput,
  };
}

function mergeFromHintsOnly(hints: Hints, rawInput: string): MergedParse {
  const dateHint = hints.dates[0];
  const places =
    hints.places.length > 0 ? hints.places : [{ name: "", raw: "" }];

  const legs = places.map((place, i) => {
    const nights =
      hints.nights?.value ??
      (dateHint?.from && dateHint?.to
        ? nightsBetween(dateHint.from, dateHint.to)
        : null);

    return {
      origin: null as string | null,
      destination: place.name || null,
      arrivalDate: i === 0 ? (dateHint?.from ?? null) : null,
      departureDate: i === 0 ? (dateHint?.to ?? null) : null,
      nights,
      monthHint:
        !dateHint?.from && dateHint?.month != null && dateHint?.year != null
          ? { month: dateHint.month, year: dateHint.year }
          : null,
      preferences: {
        hotelCategory: hints.category?.stars ?? null,
        area: null as string | null,
        boardCode: (hints.board?.code as InformalBoardCode | undefined) ?? null,
        beachfront: hints.flags.includes("beach") ? true : null,
      },
    };
  });

  const children = hints.children?.ages.length
    ? hints.children.ages.map((age) => ({ age }))
    : hints.children?.count
      ? Array.from({ length: hints.children.count }, () => ({ age: 10 }))
      : [];

  return {
    legs,
    travelers: {
      adults: hints.adults?.value ?? null,
      children,
    },
    budget: hints.budget
      ? {
          amount: hints.budget.amount,
          currency: hints.budget.currency,
          per: hints.budget.per,
        }
      : null,
    tags: [...hints.flags],
    uncertain: {},
    rawInput,
  };
}

function nightsBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  const n = Math.round((b - a) / 86_400_000);
  return Math.max(1, n);
}
