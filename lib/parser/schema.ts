import { z } from "zod";

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
  budget: z.number().optional().describe("Presupuesto mencionado."),
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
