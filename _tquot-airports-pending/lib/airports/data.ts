/**
 * Re-export del dataset existente de OpenFlights.
 *
 * IMPORTANTE: este archivo asume que tu lib/airports.ts existente exporta
 * un array `airports` con la forma definida en types.ts.
 *
 * Si la exportación tiene otro nombre o estructura, adapta SOLO este archivo,
 * sin tocar lib/airports.ts ni el resto del módulo.
 */

import { airports as rawAirports } from "@/lib/airports";
import type { Airport } from "./types";

export const airports: Airport[] = rawAirports as Airport[];
