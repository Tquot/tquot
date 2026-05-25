import { z } from "zod";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";

const hotelLevelSchema = z.enum(["budget", "standard", "premium", "luxury"]);

export const RefineActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_insurance"),
    params: z.object({
      destination: z.string(),
      days: z.number().int().min(1),
      pax: z.number().int().min(1),
    }),
  }),
  z.object({
    action: z.literal("change_hotel_level"),
    params: z.object({
      level: hotelLevelSchema.optional(),
      area: z.string().optional(),
      preference: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal("filter_direct_flights"),
  }),
  z.object({
    action: z.literal("cheaper"),
  }),
  z.object({
    action: z.literal("add_experience"),
    params: z.object({ type: z.string().min(1) }),
  }),
  z.object({
    action: z.literal("search_web"),
    params: z.object({ query: z.string().min(1) }),
  }),
  z.object({
    action: z.literal("explain"),
    params: z.object({ text: z.string().min(1) }),
  }),
  z.object({
    action: z.literal("unknown"),
    params: z.object({ text: z.string().min(1) }),
  }),
]);

export const RefineClassifyBodySchema = z.object({
  currentQuote: z.custom<Quote>(),
  message: z.string().min(1).max(500),
  tripInput: z.custom<ParsedTripInput>(),
  agentId: z.string().min(1),
});

export const RefineApplyBodySchema = z.object({
  action: RefineActionSchema,
  currentQuote: z.custom<Quote>(),
  tripInput: z.custom<ParsedTripInput>(),
  agentId: z.string().min(1),
});
