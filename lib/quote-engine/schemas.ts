export * from "./schemas-v2";
export { ParsedTripInputSchemaV2 as ParsedTripInputSchema } from "./schemas-v2";
export type { ParsedTripInputV2 as ParsedTripInput } from "./schemas-v2";

import { z } from "zod";
import { ParsedTripInputSchemaV2 } from "./schemas-v2";
import { toParsedTripInputV2 } from "./migrate-v1-v2";
import type { ParsedTripInput as BuildQuoteParsedTripInput } from "@/lib/quotes/build-quote";

const MAX_PARSE_INPUT_CHARS = Number(process.env.PARSER_MAX_INPUT_CHARS ?? 8000);

export const PreviousPartialSchema = z
  .object({
    destination: z.string().optional(),
    origin: z.string().optional(),
    dates: z
      .object({
        start: z.string(),
        end: z.string(),
      })
      .optional(),
    passengers: z
      .object({
        adults: z.number().int().min(1),
        children: z.number().int().min(0),
      })
      .optional(),
    locale: z.enum(["es", "en"]).optional(),
    questions: z.array(z.string()).optional(),
  })
  .passthrough();

export const ParseRequestSchema = z.object({
  text: z.string().min(1).max(MAX_PARSE_INPUT_CHARS),
  currentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  languageHint: z.enum(["es", "en"]).optional(),
  locale: z.enum(["es", "en"]).optional(),
  previousPartial: PreviousPartialSchema.optional(),
  questions: z.array(z.string()).optional(),
});

export type ParseRequestBody = z.infer<typeof ParseRequestSchema>;

export function parseParsedTripInputBody(
  body: unknown,
):
  | { success: true; data: import("./schemas-v2").ParsedTripInputV2 }
  | { success: false; error: string } {
  const v2Result = ParsedTripInputSchemaV2.safeParse(body);
  if (v2Result.success) {
    return { success: true, data: v2Result.data };
  }

  const legacy = z
    .object({
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
        hotelLevel: z.enum(["budget", "standard", "premium", "luxury"]),
        directFlights: z.boolean(),
        accessibility: z.boolean(),
      }),
      includeHotels: z.boolean(),
      includeExperiences: z.boolean(),
      includeFlights: z.boolean(),
      locale: z.enum(["es", "en"]).optional(),
      enrichedTrip: z.unknown().optional(),
      airportChoices: z
        .object({
          origin: z.union([z.string(), z.literal("all")]),
          destination: z.union([z.string(), z.literal("all")]),
        })
        .optional(),
    })
    .passthrough()
    .safeParse(body);

  if (legacy.success) {
    return {
      success: true,
      data: toParsedTripInputV2(legacy.data as BuildQuoteParsedTripInput),
    };
  }

  return { success: false, error: v2Result.error.message };
}
