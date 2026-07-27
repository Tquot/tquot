import { z } from "zod";

export const HotelFeaturesSchema = z.object({
  accessible_room: z.boolean().optional(),
  accessible_bathroom: z.boolean().optional(),
  roll_in_shower: z.boolean().optional(),
  grab_bars: z.boolean().optional(),
  elevator: z.boolean().optional(),
  ramp_entrance: z.boolean().optional(),
  wide_doorways: z.boolean().optional(),
  visual_alarms: z.boolean().optional(),
  hearing_loop: z.boolean().optional(),
  braille_signage: z.boolean().optional(),
  service_dog_allowed: z.boolean().optional(),
  accessible_parking: z.boolean().optional(),
  staff_trained: z.boolean().optional(),
});
export type HotelFeatures = z.infer<typeof HotelFeaturesSchema>;

export const ExperienceFeaturesSchema = z.object({
  wheelchair_accessible: z.boolean().optional(),
  reduced_mobility_friendly: z.boolean().optional(),
  hearing_loop: z.boolean().optional(),
  sign_language_guide: z.boolean().optional(),
  audio_description: z.boolean().optional(),
  braille_material: z.boolean().optional(),
  sensory_friendly: z.boolean().optional(),
  service_dog_allowed: z.boolean().optional(),
});
export type ExperienceFeatures = z.infer<typeof ExperienceFeaturesSchema>;

export const TransferFeaturesSchema = z.object({
  wheelchair_accessible_vehicle: z.boolean().optional(),
  wheelchair_lift: z.boolean().optional(),
  wheelchair_securement: z.boolean().optional(),
  driver_trained: z.boolean().optional(),
  service_dog_allowed: z.boolean().optional(),
});
export type TransferFeatures = z.infer<typeof TransferFeaturesSchema>;

/**
 * Información de accesibilidad de un item, con metadata sobre la fuente.
 */
export interface AccessibilityInfo<
  F extends Record<string, boolean | undefined> = Record<
    string,
    boolean | undefined
  >,
> {
  features: F;
  source: "tur4all" | "hotelbeds_content" | "manual" | "derived" | "unknown";
  sourceUrl?: string;
  verified: boolean;
  verifiedAt?: string;
  notes?: string;
}

/**
 * Perfil de accesibilidad del viaje. Lo que la persona con discapacidad necesita.
 */
export const AccessibilityProfileSchema = z.object({
  required: z.object({
    hotel: z.array(z.string()).default([]),
    experience: z.array(z.string()).default([]),
    transfer: z.array(z.string()).default([]),
  }),
  preferred: z.object({
    hotel: z.array(z.string()).default([]),
    experience: z.array(z.string()).default([]),
    transfer: z.array(z.string()).default([]),
  }),
  notes: z.string().optional(),
});
export type AccessibilityProfile = z.infer<typeof AccessibilityProfileSchema>;

export const EMPTY_ACCESSIBILITY_PROFILE: AccessibilityProfile = {
  required: { hotel: [], experience: [], transfer: [] },
  preferred: { hotel: [], experience: [], transfer: [] },
};
