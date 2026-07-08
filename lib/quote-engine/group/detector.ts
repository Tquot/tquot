import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { GroupDetection } from "./types";

const CORPORATE_KEYWORDS = [
  "congreso",
  "evento",
  "incentivo",
  "delegación",
  "delegacion",
  "mice",
  "convención",
  "convencion",
  "corporativo",
  "corporativa",
  "empresa",
  "reunión anual",
  "reunion anual",
  "team building",
  "kick off",
  "kickoff",
  "lanzamiento",
  "asamblea",
  "jornadas",
  "workshop",
];

const GROUP_PAX_THRESHOLD = 8;

export function detectGroup(parsed: ParsedTripInputV2): GroupDetection {
  const totalPax = parsed.travelers.adults + parsed.travelers.children.length;
  const byPax = totalPax > GROUP_PAX_THRESHOLD;

  const lowerInput = (parsed.rawInput ?? "").toLowerCase();
  const byKeyword = CORPORATE_KEYWORDS.some((k) => lowerInput.includes(k));

  let reason: GroupDetection["reason"] = "none";
  if (byPax && byKeyword) reason = "both";
  else if (byPax) reason = "pax_threshold";
  else if (byKeyword) reason = "corporate_keyword";

  return {
    isGroup: byPax || byKeyword,
    isCorporate: byKeyword,
    totalPax,
    reason,
  };
}

