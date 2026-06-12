import { z } from "zod";

function preprocessBudget(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = value.match(/\d[\d.,]*/);
    if (!match) return undefined;
    return match[0].replace(/\./g, "").replace(",", ".");
  }
  return value;
}

// ─────────────────────────────────────────────────────────────
// Schema principal: TripRequest (plano para Claude Structured Outputs)
// ─────────────────────────────────────────────────────────────

export const TripRequestSchema = z.object({
  destination: z.string().describe("Destino principal del viaje."),
  origin: z.string().optional().describe("Origen del viaje si se menciona."),
  departureDate: z.string().optional().describe("Fecha de salida en formato YYYY-MM-DD."),
  returnDate: z.string().optional().describe("Fecha de regreso en formato YYYY-MM-DD."),
  adults: z.number().optional().describe("Número de adultos."),
  children: z.number().optional().describe("Número de niños."),
  budget: z
    .preprocess(preprocessBudget, z.coerce.number().optional())
    .describe("Presupuesto mencionado."),
  currency: z.string().optional().describe("Moneda del presupuesto, por ejemplo EUR o USD."),
  hotelCategory: z.number().optional().describe("Categoría de hotel en estrellas."),
  specialRequests: z.string().optional().describe("Peticiones especiales en texto libre."),
  accessibilityNeeds: z.boolean().optional().describe("true si hay necesidades de accesibilidad."),
  accessibilityDetails: z.string().optional().describe("Detalles de accesibilidad si existen."),
  tripType: z
    .enum(["transport_only", "accommodation_only", "full_trip"])
    .optional()
    .describe(
      "transport_only: solo vuelo/transfer/coche sin hotel; accommodation_only: solo alojamiento; full_trip: viaje completo o por defecto.",
    ),
  durationDays: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Duración del viaje en días de calendario cuando se menciona sin fechas fijas (ej: 10 días, una semana). Para noches: durationDays = noches + 1.",
    ),
  tripTheme: z
    .enum([
      "wine_tourism",
      "safari",
      "corporate",
      "beach",
      "city",
      "adventure",
      "wellness",
      "cultural",
      "honeymoon",
      "family",
      "groups_mice",
    ])
    .optional()
    .describe("Tema o tipo de viaje inferido del contexto."),
  experienceKeywords: z
    .array(z.string())
    .optional()
    .describe("Actividades o experiencias concretas mencionadas (ej: catas privadas, safari)."),
  lodgingPreference: z
    .enum([
      "hotel",
      "winery",
      "lodge",
      "riad",
      "boutique",
      "resort",
      "apartment",
      "hostel",
    ])
    .optional()
    .describe("Tipo de alojamiento preferido si se menciona."),
  travelPurpose: z
    .enum(["leisure", "business", "honeymoon", "groups_mice"])
    .optional()
    .describe("Propósito del viaje: ocio, negocios, luna de miel o grupos/MICE."),
  requirements: z
    .array(z.string())
    .optional()
    .describe("Requisitos estructurados (ej: sala de reuniones, habitaciones comunicadas)."),
  status: z.enum(["ready", "needs_input"]),
  questions: z.array(z.string()).optional(),
});

export type TripRequest = z.infer<typeof TripRequestSchema>;

// ─────────────────────────────────────────────────────────────
// Schema de preguntas (turno 2)
// ─────────────────────────────────────────────────────────────

export const ParserQuestionsSchema = z.object({
  questions: z.array(z.string()),
});

export type ParserQuestion = string;
export type ParserQuestions = z.infer<typeof ParserQuestionsSchema>;
