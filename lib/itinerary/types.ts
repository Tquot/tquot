import { z } from "zod";

export const ItineraryDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayNumber: z.number().int().min(1),
  title: z.string().min(1).max(100),
  narrative: z.string().min(1).max(800),
  legId: z.string().optional(),
  highlights: z.array(z.string()).max(5).default([]),
});
export type ItineraryDay = z.infer<typeof ItineraryDaySchema>;

export const ItinerarySchema = z.object({
  days: z.array(ItineraryDaySchema).min(1).max(30),
  generatedAt: z.string(),
  model: z.string(),
});
export type Itinerary = z.infer<typeof ItinerarySchema>;
