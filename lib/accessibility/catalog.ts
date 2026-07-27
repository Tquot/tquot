/**
 * Vocabulario cerrado de características de accesibilidad.
 * Usa "accesible" / "personas con discapacidad" en textos de UI.
 */

export type HotelAccessibilityFeature =
  | "accessible_room"
  | "accessible_bathroom"
  | "roll_in_shower"
  | "grab_bars"
  | "elevator"
  | "ramp_entrance"
  | "wide_doorways"
  | "visual_alarms"
  | "hearing_loop"
  | "braille_signage"
  | "service_dog_allowed"
  | "accessible_parking"
  | "staff_trained";

export type ExperienceAccessibilityFeature =
  | "wheelchair_accessible"
  | "reduced_mobility_friendly"
  | "hearing_loop"
  | "sign_language_guide"
  | "audio_description"
  | "braille_material"
  | "sensory_friendly"
  | "service_dog_allowed";

export type TransferAccessibilityFeature =
  | "wheelchair_accessible_vehicle"
  | "wheelchair_lift"
  | "wheelchair_securement"
  | "driver_trained"
  | "service_dog_allowed";

export const HOTEL_FEATURE_LABELS: Record<HotelAccessibilityFeature, string> = {
  accessible_room: "Habitación accesible",
  accessible_bathroom: "Baño accesible",
  roll_in_shower: "Ducha con suelo continuo",
  grab_bars: "Barras de apoyo",
  elevator: "Ascensor",
  ramp_entrance: "Entrada con rampa",
  wide_doorways: "Puertas anchas",
  visual_alarms: "Alarmas visuales",
  hearing_loop: "Bucle magnético",
  braille_signage: "Señalización en braille",
  service_dog_allowed: "Admite perro guía",
  accessible_parking: "Aparcamiento accesible",
  staff_trained: "Personal con formación",
};

export const EXPERIENCE_FEATURE_LABELS: Record<
  ExperienceAccessibilityFeature,
  string
> = {
  wheelchair_accessible: "Recorrido en silla de ruedas",
  reduced_mobility_friendly: "Movilidad reducida",
  hearing_loop: "Bucle magnético",
  sign_language_guide: "Guía en LSE",
  audio_description: "Audiodescripción",
  braille_material: "Material en braille",
  sensory_friendly: "Baja estimulación sensorial",
  service_dog_allowed: "Admite perro guía",
};

export const TRANSFER_FEATURE_LABELS: Record<
  TransferAccessibilityFeature,
  string
> = {
  wheelchair_accessible_vehicle: "Vehículo accesible",
  wheelchair_lift: "Plataforma elevadora",
  wheelchair_securement: "Sistema de anclaje",
  driver_trained: "Conductor con formación",
  service_dog_allowed: "Admite perro guía",
};
