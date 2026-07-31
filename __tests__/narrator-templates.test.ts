import { describe, it, expect } from "vitest";
import { narrateBuildEvent } from "@/lib/narrator/templates";
import { toParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { ParsedTripInput } from "@/lib/quotes/build-quote";

const parsedV1 = {
  origin: "MAD",
  destination: "Roma",
  dates: { start: "2026-03-15", end: "2026-03-18" },
  passengers: { adults: 2, children: 0 },
  preferences: {
    hotelLevel: "standard",
    directFlights: false,
    accessibility: false,
  },
  includeHotels: true,
  includeExperiences: true,
  includeFlights: true,
} satisfies ParsedTripInput;

const parsed = toParsedTripInputV2(parsedV1);
const legId = parsed.legs[0]!.id;

describe("narrateBuildEvent", () => {
  it("section.started no genera mensaje (silencio)", () => {
    const msg = narrateBuildEvent(
      { type: "section.started", section: "flights", legId, ts: 0 },
      parsed,
    );
    expect(msg).toBeNull();
  });

  it("section.done con resultados no genera mensaje", () => {
    const flights = [
      {
        id: "f1",
        legId,
        carrier: "IB",
        carrierName: "IB",
        price: 280,
        currency: "EUR",
      },
      {
        id: "f2",
        legId,
        carrier: "VY",
        carrierName: "VY",
        price: 220,
        currency: "EUR",
      },
    ];
    const msg = narrateBuildEvent(
      {
        type: "section.done",
        section: "flights",
        legId,
        results: flights,
        ts: 0,
      },
      parsed,
    );
    expect(msg).toBeNull();
  });

  it("section.done vacío sí genera blocker", () => {
    const msg = narrateBuildEvent(
      {
        type: "section.done",
        section: "flights",
        legId,
        results: [],
        ts: 0,
      },
      parsed,
    );
    expect(msg).toMatch(/Sin resultados/);
  });

  it("build.started no genera mensaje", () => {
    const msg = narrateBuildEvent({ type: "build.started", ts: 0 }, parsed);
    expect(msg).toBeNull();
  });
});
