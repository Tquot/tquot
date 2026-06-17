import { z } from "zod";

export const RecommendedProviderSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).max(300),
  website: z.string().url(),
  contact: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
    })
    .optional(),
  reasoning: z.string().min(1).max(500),
  confidence: z.enum(["high", "medium", "low"]),
  pricingHint: z.string().optional(),
});
export type RecommendedProvider = z.infer<typeof RecommendedProviderSchema>;

export const RecommendationSchema = z.object({
  category: z.string(),
  destinationNormalized: z.string(),
  providers: z.array(RecommendedProviderSchema).length(2),
  generatedAt: z.string(),
  source: z.enum(["cache", "fresh"]),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const AgentResponseSchema = z.object({
  providers: z.array(RecommendedProviderSchema).length(2),
});
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
