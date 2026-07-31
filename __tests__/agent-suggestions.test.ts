import { describe, it, expect } from "vitest";
import * as D from "@/lib/agent/suggestions/detectors";
import { collectSuggestions } from "@/lib/agent/suggestions/rank";
import { makeCtx } from "./helpers/suggestion-ctx";

describe("directFlightUpgrade", () => {
  it("sugiere el directo si el sobrecoste está bajo umbral", () => {
    const ctx = makeCtx({
      chosenFlight: { price: 120, stops: 1 },
      candidateFlights: [
        { id: "f-direct", price: 165, stops: 0, carrier: "IB" },
      ],
    });
    const s = D.directFlightUpgrade(ctx);
    expect(s).not.toBeNull();
    expect(s!.text).toContain("45");
    expect(s!.delta).toBe(45);
  });

  it("no sugiere si el directo es desproporcionado", () => {
    const ctx = makeCtx({
      chosenFlight: { price: 120, stops: 1 },
      candidateFlights: [
        { id: "f-direct", price: 340, stops: 0, carrier: "IB" },
      ],
    });
    expect(D.directFlightUpgrade(ctx)).toBeNull();
  });

  it("no sugiere si el elegido ya es directo", () => {
    const ctx = makeCtx({
      chosenFlight: { price: 165, stops: 0 },
      candidateFlights: [
        { id: "f-direct", price: 165, stops: 0, carrier: "IB" },
      ],
    });
    expect(D.directFlightUpgrade(ctx)).toBeNull();
  });
});

describe("collectSuggestions", () => {
  it("no interrumpe más de una vez durante el build", () => {
    const ctx = makeCtx({ everythingSuggestible: true });
    const { interrupting } = collectSuggestions(ctx);
    expect(interrupting.length).toBeLessThanOrEqual(1);
  });

  it("no muestra más de dos tras el cierre", () => {
    const ctx = makeCtx({ everythingSuggestible: true });
    const { afterClose } = collectSuggestions(ctx);
    expect(afterClose.length).toBeLessThanOrEqual(2);
  });

  it("respeta los descartes", () => {
    const ctx = makeCtx({
      everythingSuggestible: true,
      dismissed: ["insurance"],
    });
    const all = collectSuggestions(ctx);
    const ids = [...all.interrupting, ...all.afterClose].map((s) => s.id);
    expect(ids).not.toContain("insurance");
  });

  it("prioriza el comparador sobre el upgrade de régimen", () => {
    const ctx = makeCtx({
      comparatorSaving: 80,
      boardUpgradeAvailable: true,
    });
    // Ensure hotel provider matches comparator "own"
    ctx.candidates.hotels = [
      {
        id: "h1",
        legId: "leg-1",
        name: "Hotel A",
        netPrice: 200,
        currency: "EUR",
        nights: 4,
        stars: 4,
        provider: "own",
        fetchedAt: new Date().toISOString(),
        boardCode: "BB",
        boardOptions: [
          {
            boardCode: "BB",
            boardLabel: "AD",
            rateKey: "r1",
            netPrice: 200,
            totalPrice: 800,
            currency: "EUR",
            refundable: true,
            available: true,
          },
          {
            boardCode: "HB",
            boardLabel: "MP",
            rateKey: "r2",
            netPrice: 220,
            totalPrice: 880,
            currency: "EUR",
            refundable: true,
            available: true,
          },
        ],
      },
    ];
    const { interrupting, afterClose } = collectSuggestions(ctx);
    const first = [...interrupting, ...afterClose][0];
    expect(first?.kind).toBe("comparatorCheaperElsewhere");
  });

  it("un detector que lanza excepción no tumba el resto", () => {
    const ctx = makeCtx({ corruptHotel: true });
    expect(() => collectSuggestions(ctx)).not.toThrow();
  });
});
