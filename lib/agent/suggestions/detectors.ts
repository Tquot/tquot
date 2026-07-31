import { fmtEur } from "@/lib/agent/format";
import type { Detector, Suggestion } from "./types";
import {
  boardOrderCode,
  childNearAgeThreshold,
  countStops,
  estimateInsurance,
  hasInsurance,
  hotelNights,
  isEuDestination,
  matchCandidateFlight,
  matchCandidateHotel,
  maxLayoverHours,
  primaryFlight,
  primaryHotel,
} from "./helpers";

export const directFlightUpgrade: Detector = (ctx) => {
  const chosenItem = primaryFlight(ctx.quote);
  const chosen = matchCandidateFlight(chosenItem, ctx.candidates.flights);
  if (!chosen && !chosenItem) return null;

  const chosenStops = chosen
    ? countStops(chosen)
    : countStops(chosenItem!);
  if (chosenStops === 0) return null;

  const chosenPrice = chosen?.price ?? chosenItem?.price ?? 0;

  const direct = ctx.candidates.flights
    .filter((f) => countStops(f) === 0)
    .sort((a, b) => a.price - b.price)[0];
  if (!direct) return null;

  const delta = direct.price - chosenPrice;
  const threshold = Math.max(60, chosenPrice * 0.2);
  if (delta <= 0 || delta > threshold) return null;

  const id = `directFlight:${direct.id}`;
  return {
    id,
    kind: "directFlightUpgrade",
    priority: 2,
    text: `Hay directo con ${direct.carrier} por ${fmtEur(delta)} más. ¿Lo cambio?`,
    delta,
    interrupts: true,
    actions: [
      {
        id: "accept",
        label: "Cambiar",
        variant: "primary",
        patch: { type: "selectFlight", flightId: direct.id },
      },
      {
        id: "dismiss",
        label: "No",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id },
      },
    ],
  };
};

export const refundableUpgrade: Detector = (ctx) => {
  const chosenItem = primaryHotel(ctx.quote);
  const chosen = matchCandidateHotel(chosenItem, ctx.candidates.hotels);
  if (!chosen || chosen.refundable) return null;

  const alt = ctx.candidates.hotels
    .filter((h) => h.name === chosen.name && h.refundable)
    .sort((a, b) => a.netPrice - b.netPrice)[0];
  if (!alt) return null;

  const nights = hotelNights(chosen, ctx.parsed.legs[0]);
  const deltaPerNight = alt.netPrice - chosen.netPrice;
  const deltaTotal = deltaPerNight * nights;
  if (deltaPerNight <= 0 || deltaPerNight / chosen.netPrice > 0.1) return null;

  const id = `refundable:${alt.id}`;
  return {
    id,
    kind: "refundableUpgrade",
    priority: 1,
    text: `El mismo hotel reembolsable por ${fmtEur(deltaTotal)} más en total. ¿Lo pongo?`,
    delta: deltaTotal,
    interrupts: false,
    actions: [
      {
        id: "accept",
        label: "Sí",
        variant: "primary",
        patch: { type: "selectHotel", hotelId: alt.id },
      },
      {
        id: "dismiss",
        label: "No",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id },
      },
    ],
  };
};

export const boardUpgrade: Detector = (ctx) => {
  const item = primaryHotel(ctx.quote);
  const hotel = matchCandidateHotel(item, ctx.candidates.hotels);
  const boardOptions =
    hotel?.boardOptions ?? item?.hotelDetails?.boardOptions;
  const boardCode = hotel?.boardCode ?? item?.hotelDetails?.boardCode;
  if (!boardOptions?.length || !boardCode || !hotel) return null;

  const current = boardOptions.find((b) => b.boardCode === boardCode);
  if (!current) return null;

  const order = ["SA", "AD", "MP", "PC"];
  const currentIdx = order.indexOf(boardOrderCode(current.boardCode));
  if (currentIdx < 0) return null;

  const next = boardOptions.find(
    (b) => order.indexOf(boardOrderCode(b.boardCode)) === currentIdx + 1,
  );
  if (!next) return null;

  const pax =
    ctx.parsed.travelers.adults + ctx.parsed.travelers.children.length;
  const deltaPerNight = next.netPrice - current.netPrice;
  const perPaxPerDay = deltaPerNight / Math.max(1, pax);
  if (perPaxPerDay <= 0 || perPaxPerDay > 14) return null;

  const label: Record<string, string> = {
    AD: "desayuno",
    MP: "media pensión",
    PC: "pensión completa",
    BB: "desayuno",
    HB: "media pensión",
    FB: "pensión completa",
  };
  const nextUi = boardOrderCode(next.boardCode);
  const nights = hotelNights(hotel, ctx.parsed.legs[0]);
  const id = `board:${hotel.id}:${next.boardCode}`;

  return {
    id,
    kind: "boardUpgrade",
    priority: 3,
    text: `${label[nextUi] ?? label[next.boardCode] ?? next.boardCode} sale a ${fmtEur(perPaxPerDay)} por persona y día. ¿Subo a ${nextUi}?`,
    delta: deltaPerNight * nights,
    interrupts: false,
    actions: [
      {
        id: "accept",
        label: `A ${nextUi}`,
        variant: "primary",
        patch: {
          type: "setBoard",
          hotelId: hotel.id,
          boardCode: next.boardCode,
        },
      },
      {
        id: "dismiss",
        label: "No",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id },
      },
    ],
  };
};

export const insuranceMissing: Detector = (ctx) => {
  if (hasInsurance(ctx.quote)) return null;

  const total = ctx.quote.pricing.finalTotal;
  const nights = ctx.parsed.legs.reduce(
    (s, l) =>
      s +
      Math.max(
        1,
        Math.round(
          (new Date(l.departureDate).getTime() -
            new Date(l.arrivalDate).getTime()) /
            86_400_000,
        ),
      ),
    0,
  );
  const nonEu = ctx.parsed.legs.some(
    (l) => !isEuDestination(l.destination),
  );
  const hasChildren = ctx.parsed.travelers.children.length > 0;

  const justified = total > 1500 || nights > 10 || nonEu || hasChildren;
  if (!justified) return null;

  const pax =
    ctx.parsed.travelers.adults + ctx.parsed.travelers.children.length;
  const estimate = estimateInsurance({ pax, nights, nonEu });

  const why = nonEu
    ? "Fuera de la UE"
    : total > 1500
      ? `${fmtEur(total)} de viaje`
      : nights > 10
        ? `${nights} noches`
        : "Viaje con menores";

  return {
    id: "insurance",
    kind: "insuranceMissing",
    priority: 2,
    text: `Sin seguro. ${why}, básico para ${pax} pax: desde ${fmtEur(estimate)}.`,
    delta: estimate,
    interrupts: false,
    actions: [
      {
        id: "accept",
        label: "Añadir",
        variant: "primary",
        patch: { type: "addInsurance", tier: "basic" },
      },
      {
        id: "dismiss",
        label: "No",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id: "insurance" },
      },
    ],
  };
};

export const transferGap: Detector = (ctx) => {
  if (ctx.quote.transfers.some((t) => !t.alternative)) return null;
  if (ctx.quote.flights.length === 0 || ctx.quote.hotels.length === 0) {
    return null;
  }

  const candidate = [...ctx.candidates.transfers].sort(
    (a, b) => a.price - b.price,
  )[0];
  if (!candidate) return null;

  const id = `transfer:${candidate.id}`;
  return {
    id,
    kind: "transferGap",
    priority: 2,
    text: `Sin traslado aeropuerto-hotel. Privado ida y vuelta: ${fmtEur(candidate.price)}.`,
    delta: candidate.price,
    interrupts: false,
    actions: [
      {
        id: "accept",
        label: "Añadir",
        variant: "primary",
        patch: { type: "addTransfer", transferId: candidate.id },
      },
      {
        id: "dismiss",
        label: "No",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id },
      },
    ],
  };
};

export const budgetOvershoot: Detector = (ctx) => {
  const budget = ctx.parsed.budget;
  if (budget.kind !== "exact" && budget.kind !== "range") return null;

  const pax =
    ctx.parsed.travelers.adults + ctx.parsed.travelers.children.length;
  const amount =
    budget.kind === "exact" ? budget.amount : budget.max;
  const ceiling = budget.perPerson ? amount * pax : amount;
  const over = ctx.quote.pricing.finalTotal - ceiling;
  if (over <= ceiling * 0.05) return null;

  const chosenItem = primaryHotel(ctx.quote);
  const chosen = matchCandidateHotel(chosenItem, ctx.candidates.hotels);
  if (!chosen) return null;

  const nights = hotelNights(chosen, ctx.parsed.legs[0]);
  const cheaper = ctx.candidates.hotels
    .filter((h) => h.legId === chosen.legId && h.netPrice < chosen.netPrice)
    .sort((a, b) => b.netPrice - a.netPrice)
    .find(
      (h) =>
        ctx.quote.pricing.finalTotal -
          (chosen.netPrice - h.netPrice) * nights <=
        ceiling,
    );

  if (!cheaper) {
    return {
      id: "budgetOvershootNoFix",
      kind: "budgetOvershoot",
      priority: 1,
      text: `${fmtEur(over)} por encima del presupuesto y no hay hotel que lo arregle. ¿Bajo categoría o quito extras?`,
      interrupts: false,
      actions: [
        {
          id: "dismiss",
          label: "Sigo así",
          variant: "ghost",
          patch: {
            type: "dismissSuggestion",
            id: "budgetOvershootNoFix",
          },
        },
      ],
    };
  }

  const saving = (chosen.netPrice - cheaper.netPrice) * nights;
  const id = `budgetOvershoot:${cheaper.id}`;
  return {
    id,
    kind: "budgetOvershoot",
    priority: 1,
    text: `${fmtEur(over)} por encima. Con ${cheaper.name} entra: ${fmtEur(saving)} menos.`,
    delta: -saving,
    interrupts: true,
    actions: [
      {
        id: "accept",
        label: "Cambiar",
        variant: "primary",
        patch: { type: "selectHotel", hotelId: cheaper.id },
      },
      {
        id: "dismiss",
        label: "Dejar así",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id },
      },
    ],
  };
};

export const budgetHeadroom: Detector = (ctx) => {
  const budget = ctx.parsed.budget;
  if (budget.kind !== "exact" && budget.kind !== "range") return null;

  const pax =
    ctx.parsed.travelers.adults + ctx.parsed.travelers.children.length;
  const amount =
    budget.kind === "exact" ? budget.amount : budget.max;
  const ceiling = budget.perPerson ? amount * pax : amount;
  const headroom = ceiling - ctx.quote.pricing.finalTotal;
  if (headroom < ceiling * 0.2) return null;

  const chosenItem = primaryHotel(ctx.quote);
  const chosen = matchCandidateHotel(chosenItem, ctx.candidates.hotels);
  if (!chosen) return null;

  const nights = hotelNights(chosen, ctx.parsed.legs[0]);
  const better = ctx.candidates.hotels
    .filter((h) => h.legId === chosen.legId && h.netPrice > chosen.netPrice)
    .sort((a, b) => b.netPrice - a.netPrice)
    .find(
      (h) =>
        ctx.quote.pricing.finalTotal +
          (h.netPrice - chosen.netPrice) * nights <=
        ceiling,
    );

  if (!better) return null;

  const extra = (better.netPrice - chosen.netPrice) * nights;
  const id = `headroom:${better.id}`;
  return {
    id,
    kind: "budgetHeadroom",
    priority: 3,
    text: `Sobran ${fmtEur(headroom)}. ${better.name} ${"★".repeat(Math.min(5, better.stars))} entra por ${fmtEur(extra)} más.`,
    delta: extra,
    interrupts: false,
    actions: [
      {
        id: "accept",
        label: "Subir",
        variant: "primary",
        patch: { type: "selectHotel", hotelId: better.id },
      },
      {
        id: "dismiss",
        label: "No",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id },
      },
    ],
  };
};

export const longLayover: Detector = (ctx) => {
  const chosenItem = primaryFlight(ctx.quote);
  const chosen = matchCandidateFlight(chosenItem, ctx.candidates.flights);
  const target = chosen ?? chosenItem;
  if (!target) return null;

  const layover = maxLayoverHours(target);
  if (layover < 4) return null;

  const id = `layover:${"id" in target ? target.id : "flight"}`;
  return {
    id,
    kind: "longLayover",
    priority: 3,
    text: `Escala de ${Math.round(layover)} h en el vuelo elegido. Avísalo al cliente.`,
    interrupts: false,
    actions: [
      {
        id: "dismiss",
        label: "Visto",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id },
      },
    ],
  };
};

export const cancellationDeadlineTight: Detector = (ctx) => {
  const item = primaryHotel(ctx.quote);
  const hotel = matchCandidateHotel(item, ctx.candidates.hotels);
  if (!hotel?.cancellationDeadline) return null;

  const days = Math.floor(
    (new Date(hotel.cancellationDeadline).getTime() - Date.now()) /
      86_400_000,
  );
  if (days < 0 || days > 7) return null;

  const id = `deadline:${hotel.id}`;
  return {
    id,
    kind: "cancellationDeadlineTight",
    priority: 1,
    text: `Deadline de cancelación en ${days} ${days === 1 ? "día" : "días"}. Confirma pronto o busca reembolsable.`,
    interrupts: false,
    actions: [
      {
        id: "dismiss",
        label: "Visto",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id },
      },
    ],
  };
};

export const childAgeRateRisk: Detector = (ctx) => {
  const children = ctx.parsed.travelers.children;
  if (children.length === 0) return null;

  const atRisk = children.filter((c) => childNearAgeThreshold(c.age));
  if (atRisk.length === 0) return null;

  const ages = atRisk.map((c) => c.age + 1).join(" y ");
  return {
    id: "childAgeRisk",
    kind: "childAgeRateRisk",
    priority: 1,
    text: `El menor de ${ages} puede cambiar de tramo de edad durante el viaje. Revisa la tarifa antes de confirmar.`,
    interrupts: false,
    actions: [
      {
        id: "dismiss",
        label: "Visto",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id: "childAgeRisk" },
      },
    ],
  };
};

export const comparatorCheaperElsewhere: Detector = (ctx) => {
  if (!ctx.comparator || ctx.comparator.length < 2) return null;

  const item = primaryHotel(ctx.quote);
  const hotel = matchCandidateHotel(item, ctx.candidates.hotels);
  if (!hotel) return null;

  const current = ctx.comparator.find((e) => e.provider === hotel.provider);
  const cheapest = ctx.comparator
    .filter((e) => e.available && e.totalPrice != null)
    .sort((a, b) => (a.totalPrice ?? 0) - (b.totalPrice ?? 0))[0];

  if (!current || !cheapest || cheapest.provider === hotel.provider) return null;

  const saving = (current.totalPrice ?? 0) - (cheapest.totalPrice ?? 0);
  if (saving < 25) return null;

  const id = `comparator:${cheapest.provider}`;
  return {
    id,
    kind: "comparatorCheaperElsewhere",
    priority: 1,
    text: `Mismo hotel en ${cheapest.provider}: ${fmtEur(saving)} menos de neto.`,
    delta: -saving,
    interrupts: true,
    actions: [
      {
        id: "accept",
        label: "Usar ese",
        variant: "primary",
        patch: {
          type: "switchProvider",
          hotelId: hotel.id,
          provider: cheapest.provider,
        },
      },
      {
        id: "dismiss",
        label: "No",
        variant: "ghost",
        patch: { type: "dismissSuggestion", id },
      },
    ],
  } satisfies Suggestion;
};
