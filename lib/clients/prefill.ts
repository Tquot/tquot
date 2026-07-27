import type { InferredPreferences } from "./types";

/**
 * Texto inicial inyectado en el chat al iniciar una cotización
 * con preferencias de un cliente. No se envía automáticamente.
 */
export function buildPrefillFromClient(input: {
  clientName: string;
  preferences: InferredPreferences;
}): string {
  const { clientName, preferences } = input;
  const parts: string[] = [];

  parts.push(`Nueva cotización para ${clientName}.`);

  if (preferences.frequentDestinations.length > 0) {
    const top = preferences.frequentDestinations[0];
    parts.push(`Suele viajar a ${top.destination} (${top.count} veces).`);
  }
  if (preferences.preferredHotelTier) {
    parts.push(`Nivel hotel habitual: ${preferences.preferredHotelTier}.`);
  }
  if (preferences.preferredHotelStyles.length > 0) {
    parts.push(
      `Estilos preferidos: ${preferences.preferredHotelStyles.join(", ")}.`,
    );
  }
  if (preferences.typicalGroupSize && preferences.typicalGroupSize > 1) {
    parts.push(
      `Viajes habituales para ${preferences.typicalGroupSize} personas.`,
    );
  }
  if (preferences.preferredThemes.length > 0) {
    parts.push(`Temas: ${preferences.preferredThemes.join(", ")}.`);
  }
  if (preferences.averageBudgetEur) {
    parts.push(`Presupuesto medio: ${preferences.averageBudgetEur} EUR.`);
  }

  parts.push("");
  parts.push("Indica destino, fechas y cualquier ajuste sobre esta base.");

  return parts.join(" ");
}
