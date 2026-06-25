import type { ParsedTripInputV2, TripLeg } from "@/lib/quote-engine/schemas-v2";
import type { Quote } from "@/lib/quote-engine/types";
import { isV1, migrateV1ToV2, toParsedTripInputV2 } from "@/lib/quote-engine/migrate-v1-v2";
import type { ParsedTripInput } from "@/lib/quotes/build-quote";
import { shouldIncludeTransfers } from "@/lib/quotes/transfer-eligibility";
import { SERVICE_CATALOG, type ServiceCategory } from "./catalog";

export interface RelevantCategory {
  category: ServiceCategory;
  scope: "global" | "per_destination";
  legs: TripLeg[];
}

const MAX_RECOMMENDATIONS = 5;

export function normalizeParsedInput(
  parsed: ParsedTripInputV2 | unknown,
): ParsedTripInputV2 {
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    (parsed as ParsedTripInputV2).version === 2
  ) {
    return parsed as ParsedTripInputV2;
  }

  if (isV1(parsed)) {
    if ("dates" in parsed && "passengers" in parsed) {
      return toParsedTripInputV2(parsed as unknown as ParsedTripInput);
    }
    const rawInput =
      typeof parsed === "object" &&
      parsed !== null &&
      "rawInput" in parsed &&
      typeof (parsed as { rawInput?: unknown }).rawInput === "string"
        ? (parsed as { rawInput: string }).rawInput
        : "";
    return migrateV1ToV2(parsed, rawInput);
  }

  return parsed as ParsedTripInputV2;
}

export function selectRelevantCategories(
  parsed: ParsedTripInputV2 | unknown,
  quote: Quote,
): RelevantCategory[] {
  const normalizedParsed = normalizeParsedInput(parsed);
  const totalNights = normalizedParsed.legs.reduce((sum, leg) => {
    const a = new Date(leg.arrivalDate).getTime();
    const d = new Date(leg.departureDate).getTime();
    return sum + Math.max(1, Math.round((d - a) / 86_400_000));
  }, 0);

  const isInternational = isInternationalTrip(normalizedParsed);
  const isLuxuryTrip =
    normalizedParsed.budget.kind === "tier" && normalizedParsed.budget.tier === "luxury";
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
        parsed: normalizedParsed,
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
      legs: entry.scope === "per_destination" ? normalizedParsed.legs : [],
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
    case "travel_insurance":
      return true;
    case "visa":
      return ctx.isInternational;
    case "sim":
      return ctx.isInternational;
    case "activities":
      return needsActivityProviders(ctx.quote);
    case "tour_guide":
      return ctx.quote.experiences.length < 3;
    case "transfers":
      return (
        ctx.quote.transfers.length === 0 &&
        tripIncludesTransfersDetection(ctx.parsed)
      );
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

function needsActivityProviders(quote: Quote): boolean {
  if (quote.experiences.length < 3) return true;
  return !quote.experiences.some((experience) => experience.source === "api");
}

function tripIncludesTransfersDetection(parsed: ParsedTripInputV2): boolean {
  return parsed.legs.some((leg, index) => {
    const origin =
      leg.origin?.trim() ||
      (index > 0 ? parsed.legs[index - 1]?.destination : "") ||
      "";
    return shouldIncludeTransfers({
      origin,
      destination: leg.destination,
    });
  });
}

function prioritize(
  candidates: RelevantCategory[],
  ctx: { isCorporate: boolean; isLuxuryTrip: boolean; isLongStay: boolean },
): RelevantCategory[] {
  const score = (c: RelevantCategory): number => {
    let s = 0;
    if (c.category === "insurance" || c.category === "travel_insurance") s += 100;
    if (c.category === "visa") s += 90;
    if (c.category === "sim") s += 70;
    if (c.category === "train" || c.category === "car_rental") s += 60;
    if (c.category === "transfers") s += 58;
    if (c.category === "activities") s += 55;
    if (c.category === "tour_guide") s += 50;
    if (c.category === "restaurant" && ctx.isLuxuryTrip) s += 40;
    if (c.category === "spa" && ctx.isLuxuryTrip) s += 30;
    return s;
  };

  return [...candidates].sort((a, b) => score(b) - score(a));
}
