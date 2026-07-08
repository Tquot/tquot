import type { Travelers } from "@/lib/quote-engine/schemas-v2";
import type { RoomDistribution } from "./types";

export interface DistributionInput {
  travelers: Travelers;
  forceSingles?: number;
  preferTriples?: boolean;
  childrenSharing?: boolean;
}

/**
 * Distribuye pax en habitaciones de forma determinista.
 *
 * Nota: este algoritmo asume que los niños comparten habitación con
 * adultos en dobles, como en la especificación del bloque 3.
 */
export function distributeRooms(input: DistributionInput): RoomDistribution {
  const childrenSharing = input.childrenSharing ?? true;
  const totalAdults = Math.max(0, input.travelers.adults);
  const totalChildren = input.travelers.children.length;

  const forcedSingles = Math.max(0, input.forceSingles ?? 0);

  // Asignación base solo con adultos:
  // - dobles: 2 adultos (capacidad 2 pax)
  // - individuales: 1 adulto
  // Los "triples" se crean cuando hay niños y childrenSharing=true.
  // Cada triple resultante representa "2 adultos + 1 niño" (capacidad 3 pax).
  let remainingAdults = Math.max(0, totalAdults - forcedSingles);
  let doubles = Math.floor(remainingAdults / 2);
  let singles = forcedSingles + (remainingAdults % 2);
  let triples = 0;

  if (childrenSharing && totalChildren > 0) {
    let remainingChildren = totalChildren;

    while (remainingChildren > 0) {
      if (doubles > 0) {
        // Convertimos 1 doble (2 adultos) en 1 triple (2 adultos + 1 niño)
        doubles -= 1;
        triples += 1;
        remainingChildren -= 1;
        continue;
      }

      // Si ya no hay dobles, intentamos convertir 2 individuales en 1 triple.
      // Esto mantiene el nº de adultos y crea 1 plaza extra para el niño.
      if (singles >= 2) {
        singles -= 2;
        triples += 1;
        remainingChildren -= 1;
        continue;
      }

      break;
    }
  }

  const totalRooms = doubles + singles + triples;

  return { doubles, singles, triples, totalRooms };
}

