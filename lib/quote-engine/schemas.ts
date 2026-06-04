import { z } from "zod";
import type { ParsedTripInput } from "@/lib/quotes/build-quote";

const hotelLevelSchema = z.enum(["budget", "standard", "premium", "luxury"]);

export const ParsedTripInputSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  dates: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
  }),
  passengers: z.object({
    adults: z.number().int().min(1),
    children: z.number().int().min(0),
  }),
  budget: z.number().optional(),
  preferences: z.object({
    hotelLevel: hotelLevelSchema,
    directFlights: z.boolean(),
    accessibility: z.boolean(),
  }),
  includeHotels: z.boolean(),
  includeExperiences: z.boolean(),
  includeFlights: z.boolean(),
  locale: z.enum(["es", "en"]).optional(),
  agencyMargins: z
    .record(
      z.enum(["vuelos", "hoteles", "experiencias", "transfers", "seguros"]),
      z.number(),
    )
    .optional(),
  enrichedTrip: z.unknown().optional(),
  airportChoices: z
    .object({
      origin: z.union([z.string(), z.literal("all")]),
      destination: z.union([z.string(), z.literal("all")]),
    })
    .optional(),
}).passthrough();

export function parseParsedTripInputBody(
  body: unknown,
):
  | { success: true; data: ParsedTripInput }
  | { success: false; error: string } {
  const result = ParsedTripInputSchema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data as ParsedTripInput };
}
