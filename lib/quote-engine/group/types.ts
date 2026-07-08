import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Room distribution
// ─────────────────────────────────────────────────────────────

export const RoomDistributionSchema = z.object({
  doubles: z.number().int().min(0),
  singles: z.number().int().min(0),
  triples: z.number().int().min(0),
  totalRooms: z.number().int().min(0),
});

export type RoomDistribution = z.infer<typeof RoomDistributionSchema>;

// ─────────────────────────────────────────────────────────────
// MICE
// ─────────────────────────────────────────────────────────────

export const MeetingRoomSetupSchema = z.enum([
  "theater",
  "classroom",
  "boardroom",
  "banquet",
  "u_shape",
  "cocktail",
]);

export const MICEMealSchema = z.object({
  pax: z.number().int().min(0),
  days: z.number().int().min(0),
  pricePerPax: z.number().nonnegative().optional(),
});

export const MICERequirementsSchema = z.object({
  meetingRoom: z
    .object({
      capacity: z.number().int().min(1),
      setup: MeetingRoomSetupSchema,
      daysNeeded: z.number().int().min(1),
      avRequirements: z.array(z.string()).default([]),
      pricePerDay: z.number().nonnegative().optional(),
    })
    .optional(),
  coffeeBreaks: z
    .object({
      count: z.number().int().min(0),
      paxPerBreak: z.number().int().min(0),
      pricePerPax: z.number().nonnegative().optional(),
    })
    .default({ count: 0, paxPerBreak: 0 }),
  cateringMeals: z
    .object({
      breakfast: MICEMealSchema.optional(),
      lunch: MICEMealSchema.optional(),
      dinner: MICEMealSchema.optional(),
    })
    .default({}),
  galaDinner: z
    .object({
      pax: z.number().int().min(1),
      budgetPerPax: z.number().nonnegative().optional(),
    })
    .optional(),
  additionalServices: z
    .array(
      z.object({
        label: z.string(),
        price: z.number().nonnegative(),
      }),
    )
    .default([]),
});

export type MICERequirements = z.infer<typeof MICERequirementsSchema>;

// ─────────────────────────────────────────────────────────────
// Group detection
// ─────────────────────────────────────────────────────────────

export const GroupDetectionSchema = z.object({
  isGroup: z.boolean(),
  isCorporate: z.boolean(),
  totalPax: z.number().int().min(0),
  reason: z.enum([
    "pax_threshold",
    "corporate_keyword",
    "both",
    "manual",
    "none",
  ]),
});

export type GroupDetection = z.infer<typeof GroupDetectionSchema>;

export const GroupQuoteConfigSchema = z.object({
  isGroup: z.literal(true),
  isCorporate: z.boolean(),
  totalPax: z.number().int().min(1),
  detection: GroupDetectionSchema,
  distribution: RoomDistributionSchema,
  mice: MICERequirementsSchema.optional(),
});

export type GroupQuoteConfig = z.infer<typeof GroupQuoteConfigSchema>;

// ─────────────────────────────────────────────────────────────
// Pricing breakdown
// ─────────────────────────────────────────────────────────────

export interface GroupPricingBreakdown {
  perPaxBreakdown: {
    inDouble: number;
    inSingle: number;
    inTriple: number;
  };
  totalsByCategory: {
    accommodation: number;
    flights: number;
    transfers: number;
    experiences: number;
    mice: number;
  };
  grandTotal: number;
  pricePerPaxAverage: number;
  currency: string;
}

