import { describe, it, expect } from "vitest";
import { applyDefaults } from "@/lib/parser/defaults";
import { merge } from "@/lib/parser/merge-hints";
import { preExtract } from "@/lib/parser/pre-extract";

describe("applyDefaults · caso Ibiza", () => {
  it("asume origen, fechas, noches, categoría y régimen sin preguntar", () => {
    const raw =
      "hola quería saber precio ibiza agosto 4 personas algo en playa";
    const hints = preExtract(raw);
    const merged = merge(hints, null, raw);
    const { parsed, assumptions, blocking } = applyDefaults(merged, {
      defaultOrigin: "Madrid",
      flags: hints.flags,
    });

    expect(blocking).toHaveLength(0);
    expect(parsed.legs[0].destination.toLowerCase()).toContain("ibiza");
    expect(parsed.travelers.adults).toBe(4);
    expect(parsed.legs[0].origin).toBe("Madrid");
    expect(assumptions.some((a) => a.field.includes("origin"))).toBe(true);
    expect(assumptions.some((a) => a.field.includes("dates"))).toBe(true);
    expect(assumptions.some((a) => a.field.includes("nights"))).toBe(true);
    // Presupuesto nunca se inventa como cifra exacta
    expect(parsed.budget.kind).not.toBe("exact");
  });
});
