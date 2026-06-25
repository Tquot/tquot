import { describe, it, expect } from "vitest";
import { ParsedTripInputSchemaV2 } from "@/lib/quote-engine/schemas-v2";

function input(partial: Record<string, unknown>) {
  return ParsedTripInputSchemaV2.safeParse({
    version: 2,
    travelers: { adults: 2, children: [], infants: 0 },
    legs: [],
    budget: { kind: "unspecified" },
    preferences: {
      hotelStyles: [],
      locationPriorities: [],
      locationLandmarks: [],
      themes: [],
      amenities: [],
      accessibility: [],
    },
    rawInput: "",
    parsingGaps: [],
    ...partial,
  });
}

describe("ParsedTripInputV2 schema", () => {
  it("acepta input mínimo con un solo leg", () => {
    const result = input({
      legs: [
        {
          id: "l1",
          order: 0,
          destination: "Roma",
          arrivalDate: "2026-03-15",
          departureDate: "2026-03-18",
          needsAccommodation: true,
          needsTransport: "flight",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("acepta input multi-leg", () => {
    const result = input({
      legs: [
        {
          id: "l1",
          order: 0,
          origin: "MAD",
          destination: "Roma",
          arrivalDate: "2026-03-15",
          departureDate: "2026-03-18",
          needsAccommodation: true,
          needsTransport: "flight",
        },
        {
          id: "l2",
          order: 1,
          origin: "Roma",
          destination: "Florencia",
          arrivalDate: "2026-03-18",
          departureDate: "2026-03-20",
          needsAccommodation: true,
          needsTransport: "train",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza budget exact sin currency", () => {
    const result = input({
      legs: [
        {
          id: "l1",
          order: 0,
          destination: "R",
          arrivalDate: "2026-03-15",
          departureDate: "2026-03-18",
        },
      ],
      budget: { kind: "exact", amount: 2000, perPerson: false },
    });
    expect(result.success).toBe(false);
  });

  it("acepta gaps válidos y rechaza inválidos", () => {
    const ok = input({
      legs: [
        {
          id: "l1",
          order: 0,
          destination: "R",
          arrivalDate: "2026-03-15",
          departureDate: "2026-03-18",
        },
      ],
      parsingGaps: ["missing_origin", "unclear_budget"],
    });
    expect(ok.success).toBe(true);

    const bad = input({
      legs: [
        {
          id: "l1",
          order: 0,
          destination: "R",
          arrivalDate: "2026-03-15",
          departureDate: "2026-03-18",
        },
      ],
      parsingGaps: ["random_gap"],
    });
    expect(bad.success).toBe(false);
  });
});

describe("migrateV1ToV2", () => {
  it("crea un leg único desde estructura v1", async () => {
    const { migrateV1ToV2 } = await import("@/lib/quote-engine/migrate-v1-v2");
    const v2 = migrateV1ToV2({
      destination: "Roma",
      checkIn: "2026-03-15",
      checkOut: "2026-03-18",
      pax: { adults: 2, children: 1 },
      origin: "MAD",
    });
    expect(v2.legs).toHaveLength(1);
    expect(v2.legs[0].origin).toBe("MAD");
    expect(v2.travelers.children).toHaveLength(1);
    expect(v2.parsingGaps).toContain("missing_children_ages");
  });
});
