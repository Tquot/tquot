import type { MICERequirements, GroupPricingBreakdown } from "./types";
import type { RoomDistribution } from "./types";
import { computeMICECost } from "./mice-defaults";

export interface PricingInputs {
  currency: string;
  totalPax: number;
  distribution: RoomDistribution;
  totalsByCategory: {
    accommodation: number;
    flights: number;
    transfers: number;
    experiences: number;
  };
  mice?: MICERequirements;
}

export function computeGroupPricing({
  currency,
  totalPax,
  distribution,
  totalsByCategory,
  mice,
}: PricingInputs & { mice?: MICERequirements }): GroupPricingBreakdown {
  const miceCost = mice ? computeMICECost(mice) : 0;

  const accommodation = totalsByCategory.accommodation;
  const flights = totalsByCategory.flights;
  const transfers = totalsByCategory.transfers;
  const experiences = totalsByCategory.experiences;

  const grandTotal = accommodation + flights + transfers + experiences + miceCost;
  const pricePerPaxAverage = totalPax > 0 ? grandTotal / totalPax : 0;

  // Asignación aproximada de coste de alojamiento por tipo de habitación:
  // repartimos el coste total de alojamiento proporcionalmente por nº de habitaciones,
  // y luego lo dividimos entre los pax que caben en ese tipo.
  const totalRooms = Math.max(1, distribution.totalRooms);
  const hotelPerRoom = accommodation / totalRooms;

  const baseNonHotel = flights + transfers + experiences + miceCost;
  const nonHotelPerPax = totalPax > 0 ? baseNonHotel / totalPax : 0;

  const inDouble =
    distribution.doubles > 0 ? (hotelPerRoom * distribution.doubles) / 2 + nonHotelPerPax : nonHotelPerPax;
  const inSingle = (distribution.singles > 0 ? hotelPerRoom * distribution.singles : 0) / 1 + nonHotelPerPax;
  const inTriple = distribution.triples > 0 ? (hotelPerRoom * distribution.triples) / 3 + nonHotelPerPax : nonHotelPerPax;

  return {
    perPaxBreakdown: {
      inDouble,
      inSingle,
      inTriple,
    },
    totalsByCategory: {
      accommodation,
      flights,
      transfers,
      experiences,
      mice: miceCost,
    },
    grandTotal,
    pricePerPaxAverage,
    currency,
  };
}

