import type { ParsedTripInputV2, TripLeg } from "@/lib/quote-engine/schemas-v2";
import type { Quote } from "@/lib/quote-engine/types";
import { SERVICE_CATALOG, type ServiceCategory, getEntry } from "./catalog";

export interface RelevantCategory {
  category: ServiceCategory;
  scope: "global" | "per_destination";
  legs: TripLeg[];
}

const MAX_RECOMMENDATIONS = 5;

export function selectRelevantCategories(
  parsed: ParsedTripInputV2,
  quote: Quote,
): RelevantCategory[] {
  const totalNights = parsed.legs.reduce((sum, leg) => {
    const a = new Date(leg.arrivalDate).getTime();
    const d = new Date(leg.departureDate).getTime();
    return sum + Math.max(1, Math.round((d - a) / 86_400_000));
  }, 0);

  const isInternational = isInternationalTrip(parsed);
  const isLuxuryTrip =
    parsed.budget.kind === "tier" && parsed.budget.tier === "luxury";
  const isCorporate = !!quote.group?.isCorporate;
  const isLongStay = totalNights >= 7;

  const candidates: RelevantCategory[] = [];

  for (const entry of SERVICE_CATALOG) {
    if (entry.connectedProviders.length > 0) continue;

    const req = entry.requirements;
    if (req?.needsInternationalTravel && !isInternational) continue;
    if (req?.onlyForGroup && !quote.group) continue;
    if (req?.onlyForLongStay && !isLongStay) continue;
    if (req?.minNights && totalNights < req.minNights) continue;

    if (
      !isRelevantHeuristic(entry.category, {
        parsed,
        quote,
        isLuxuryTrip,
        isCorporate,
        isInternational,
      })
    ) {
      continue;
    }

    candidates.push({
      category: entry.category,
      scope: entry.scope,
      legs: entry.scope === "per_destination" ? parsed.legs : [],
    });
  }

  return prioritize(candidates, { isCorporate, isLuxuryTrip, isLongStay }).slice(
    0,
    MAX_RECOMMENDATIONS,
  );
}

function isInternationalTrip(parsed: ParsedTripInputV2): boolean {
  const ES_CITIES = [
    "MAD",
    "BCN",
    "VLC",
    "SVQ",
    "BIO",
    "AGP",
    "PMI",
    "TFS",
    "LPA",
    "ALC",
  ];
  return parsed.legs.some((leg) => {
    const dest = leg.destination.toUpperCase();
    return (
      !ES_CITIES.includes(dest) &&
      !dest.includes("SPAIN") &&
      !dest.includes("ESPAÑA")
    );
  });
}

function isRelevantHeuristic(
  category: ServiceCategory,
  ctx: {
    parsed: ParsedTripInputV2;
    quote: Quote;
    isLuxuryTrip: boolean;
    isCorporate: boolean;
    isInternational: boolean;
  },
): boolean {
  switch (category) {
    case "insurance":
      return true;
    case "visa":
      return ctx.isInternational;
    case "sim":
      return ctx.isInternational;
    case "tour_guide":
      return ctx.quote.experiences.length < 3;
    case "restaurant":
      return (
        ctx.isLuxuryTrip ||
        ctx.parsed.preferences.themes.some((t) =>
          /gastronóm|gourmet|culinari|food/i.test(t),
        )
      );
    case "spa":
      return ctx.isLuxuryTrip;
    case "train":
      return ctx.parsed.legs.some((l) => l.needsTransport === "train");
    case "car_rental":
      return ctx.parsed.legs.some((l) => l.needsTransport === "car");
  }
}

function prioritize(
  candidates: RelevantCategory[],
  ctx: { isCorporate: boolean; isLuxuryTrip: boolean; isLongStay: boolean },
): RelevantCategory[] {
  const score = (c: RelevantCategory): number => {
    let s = 0;
    if (c.category === "insurance") s += 100;
    if (c.category === "visa") s += 90;
    if (c.category === "sim") s += 70;
    if (c.category === "train" || c.category === "car_rental") s += 60;
    if (c.category === "tour_guide") s += 50;
    if (c.category === "restaurant" && ctx.isLuxuryTrip) s += 40;
    if (c.category === "spa" && ctx.isLuxuryTrip) s += 30;
    return s;
  };

  return [...candidates].sort((a, b) => score(b) - score(a));
}
