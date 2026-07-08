import type { MICERequirements } from "./types";

// Precios base en EUR (placeholders configurables luego si aplica).
const DEFAULT_PRICES = {
  meetingRoomPerDay: 800,
  coffeeBreakPerPax: 12,
  breakfastPerPax: 18,
  lunchPerPax: 35,
  dinnerPerPax: 55,
  galaPerPax: 80,
};

export function computeMICECost(mice: MICERequirements): number {
  let total = 0;

  if (mice.meetingRoom) {
    const perDay = mice.meetingRoom.pricePerDay ?? DEFAULT_PRICES.meetingRoomPerDay;
    total += perDay * mice.meetingRoom.daysNeeded;
  }

  if (mice.coffeeBreaks && mice.coffeeBreaks.count > 0) {
    const perPax = mice.coffeeBreaks.pricePerPax ?? DEFAULT_PRICES.coffeeBreakPerPax;
    total += mice.coffeeBreaks.count * mice.coffeeBreaks.paxPerBreak * perPax;
  }

  for (const mealKey of ["breakfast", "lunch", "dinner"] as const) {
    const meal = mice.cateringMeals[mealKey];
    if (!meal) continue;
    const perPaxDefault =
      mealKey === "breakfast"
        ? DEFAULT_PRICES.breakfastPerPax
        : mealKey === "lunch"
          ? DEFAULT_PRICES.lunchPerPax
          : DEFAULT_PRICES.dinnerPerPax;
    const perPax = meal.pricePerPax ?? perPaxDefault;
    total += perPax * meal.pax * meal.days;
  }

  if (mice.galaDinner) {
    const perPax = mice.galaDinner.budgetPerPax ?? DEFAULT_PRICES.galaPerPax;
    total += mice.galaDinner.pax * perPax;
  }

  for (const service of mice.additionalServices) {
    total += service.price;
  }

  return total;
}

export function createDefaultMICE(totalPax: number): MICERequirements {
  return {
    coffeeBreaks: { count: 2, paxPerBreak: totalPax, pricePerPax: undefined },
    cateringMeals: {
      lunch: { pax: totalPax, days: 1, pricePerPax: undefined },
    },
    additionalServices: [],
  };
}

