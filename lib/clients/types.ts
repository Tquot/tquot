import { z } from "zod";

export const InferredPreferencesSchema = z.object({
  preferredHotelTier: z.enum(["budget", "mid", "premium", "luxury"]).optional(),
  preferredHotelStyles: z.array(z.string()).default([]),
  frequentDestinations: z
    .array(
      z.object({
        destination: z.string(),
        count: z.number().int().min(1),
      }),
    )
    .default([]),
  typicalGroupSize: z.number().int().min(1).optional(),
  typicalAudience: z.string().optional(),
  preferredThemes: z.array(z.string()).default([]),
  averageBudgetEur: z.number().optional(),
  lastUpdated: z.string().optional(),
});
export type InferredPreferences = z.infer<typeof InferredPreferencesSchema>;

export interface Client {
  id: string;
  /** Owner user id (clients table is scoped by user_id, not agency_id). */
  agencyId: string;
  name: string;
  email?: string;
  phone?: string;
  inferredPreferences: InferredPreferences;
  totalQuotes: number;
  lastQuoteAt?: string;
  firstQuoteAt?: string;
  createdAt: string;
}

export interface ClientQuoteSummary {
  id: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface ClientWithQuoteHistory extends Client {
  quotes: ClientQuoteSummary[];
}
