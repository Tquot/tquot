import { describe, it, expect } from "vitest";
import { resolveInvalidation } from "@/lib/agent/invalidation";

describe("matriz de invalidación", () => {
  it("cambiar noches no rehace el vuelo de ida", () => {
    const r = resolveInvalidation([{ field: "nights", value: 3 }]);
    expect(r.rebuild).toContain("hotels");
    expect(r.rebuild).toContain("flightsReturn");
    expect(r.rebuild).not.toContain("flights");
  });

  it("cambiar régimen no rehace nada, solo recalcula precio local", () => {
    const r = resolveInvalidation([{ field: "board", value: "MP" }]);
    expect(r.rebuild).toEqual([]);
    expect(r.localPrice).toContain("hotels");
  });

  it("cambiar presupuesto no invalida nada", () => {
    const r = resolveInvalidation([{ field: "budget", value: 2000 }]);
    expect(r.rebuild).toEqual([]);
    expect(r.recalculate).toEqual([]);
    expect(r.localPrice).toEqual([]);
  });

  it("cambiar destino rehace todo", () => {
    const r = resolveInvalidation([{ field: "destination", value: "Lisboa" }]);
    expect(r.rebuild).toEqual(
      expect.arrayContaining([
        "flights",
        "flightsReturn",
        "hotels",
        "experiences",
        "transfers",
      ]),
    );
  });

  it("cambios combinados no duplican secciones", () => {
    const r = resolveInvalidation([
      { field: "nights", value: 3 },
      { field: "adults", value: 3 },
    ]);
    expect(new Set(r.rebuild).size).toBe(r.rebuild.length);
  });
});
