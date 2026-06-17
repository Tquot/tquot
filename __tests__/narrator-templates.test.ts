import { describe, it, expect } from "vitest";
import { narrateBuildEvent } from "@/lib/narrator/templates";

const parsed = {
  origin: "MAD",
  destination: "Roma",
  dates: { start: "2026-03-15", end: "2026-03-18" },
  passengers: { adults: 2, children: 0 },
  preferences: { hotelLevel: "standard", directFlights: false, accessibility: false },
  includeHotels: true,
  includeExperiences: true,
  includeFlights: true,
} as const;

describe("narrateBuildEvent", () => {
  it("section.started flights con origen", () => {
    const msg = narrateBuildEvent(
      { type: "section.started", section: "flights", ts: 0 },
      parsed,
    );
    expect(msg).toMatch(/MAD.*Roma/);
  });

  it("section.done flights con varios proveedores", () => {
    const flights = [
      {
        id: "f1",
        type: "flight" as const,
        title: "IB",
        provider: "IB",
        price: 280,
        markup: 0,
        finalPrice: 280,
        source: "api" as const,
        flightDetails: { airline: "IB", priceNumeric: 280 },
      },
      {
        id: "f2",
        type: "flight" as const,
        title: "VY",
        provider: "VY",
        price: 220,
        markup: 0,
        finalPrice: 220,
        source: "api" as const,
        flightDetails: { airline: "VY", priceNumeric: 220 },
      },
    ];
    const msg = narrateBuildEvent(
      { type: "section.done", section: "flights", results: flights, ts: 0 },
      parsed,
    );
    expect(msg).toMatch(/2 opciones/);
    expect(msg).toMatch(/220/);
  });

  it("build.started no genera mensaje", () => {
    const msg = narrateBuildEvent({ type: "build.started", ts: 0 }, parsed);
    expect(msg).toBeNull();
  });
});
