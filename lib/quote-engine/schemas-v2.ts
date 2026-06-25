import { z } from "zod";

// ─── Travelers ──────────────────────────────────────────

export const TravelersSchema = z.object({
  adults: z.number().int().min(1).max(50),
  children: z
    .array(z.object({ age: z.number().int().min(0).max(17) }))
    .default([]),
  infants: z.number().int().min(0).default(0),
});
export type Travelers = z.infer<typeof TravelersSchema>;

// ─── Budget ─────────────────────────────────────────────

export const BudgetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unspecified") }),
  z.object({ kind: z.literal("unlimited") }),
  z.object({
    kind: z.literal("tier"),
    tier: z.enum(["budget", "mid", "premium", "luxury"]),
  }),
  z.object({
    kind: z.literal("exact"),
    amount: z.number().positive(),
    currency: z.string().length(3),
    perPerson: z.boolean(),
  }),
  z.object({
    kind: z.literal("range"),
    min: z.number().positive(),
    max: z.number().positive(),
    currency: z.string().length(3),
    perPerson: z.boolean(),
  }),
]);
export type BudgetConstraint = z.infer<typeof BudgetSchema>;

// ─── Preferences ────────────────────────────────────────

export const HotelStyleSchema = z.enum([
  "boutique",
  "business",
  "resort",
  "apartment",
  "castle",
  "design",
  "rural",
  "eco",
  "luxury",
  "family_friendly",
  "adults_only",
]);

export const AudienceSchema = z.enum([
  "family",
  "adults_only",
  "couples",
  "solo",
  "business",
  "mixed",
]);

export const LocationPrioritySchema = z.enum([
  "central",
  "beach",
  "near_station",
  "near_airport",
  "near_landmark",
  "quiet",
]);

export const PreferencesSchema = z.object({
  hotelStyles: z.array(HotelStyleSchema).default([]),
  audience: AudienceSchema.optional(),
  locationPriorities: z.array(LocationPrioritySchema).default([]),
  locationLandmarks: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  amenities: z.array(z.string()).default([]),
  accessibility: z.array(z.string()).default([]),
});
export type TravelPreferences = z.infer<typeof PreferencesSchema>;

// ─── TripLeg ────────────────────────────────────────────

export const TripLegSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
  origin: z.string().optional(),
  destination: z.string(),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  needsAccommodation: z.boolean().default(true),
  needsTransport: z.enum(["flight", "train", "car", "none"]).default("flight"),
  legPreferences: PreferencesSchema.partial().optional(),
});
export type TripLeg = z.infer<typeof TripLegSchema>;

// ─── Parsing gaps ───────────────────────────────────────

export const ParsingGapSchema = z.enum([
  "missing_origin",
  "missing_dates",
  "missing_return_date",
  "missing_pax_count",
  "missing_children_ages",
  "ambiguous_destination",
  "unclear_budget",
  "unclear_dates_relative",
]);
export type ParsingGap = z.infer<typeof ParsingGapSchema>;

// ─── Petición completa v2 ───────────────────────────────

export const ParsedTripInputSchemaV2 = z.object({
  version: z.literal(2),
  travelers: TravelersSchema,
  legs: z.array(TripLegSchema).min(1).max(10),
  budget: BudgetSchema,
  preferences: PreferencesSchema,
  notes: z.string().optional(),
  rawInput: z.string(),
  parsingGaps: z.array(ParsingGapSchema).default([]),
});
export type ParsedTripInputV2 = z.infer<typeof ParsedTripInputSchemaV2>;

export const DEFAULT_TRIP_LEG_ID = "leg-1";

export { toParsedTripInputV2 } from "./migrate-v1-v2";
