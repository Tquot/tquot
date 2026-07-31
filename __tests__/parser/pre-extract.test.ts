import { describe, it, expect } from "vitest";
import { preExtract } from "@/lib/parser/pre-extract";

describe("preExtract · caso de referencia", () => {
  it("extrae todo lo esencial del mensaje informal de Ibiza", () => {
    const h = preExtract(
      "hola quería saber precio ibiza agosto 4 personas algo en playa",
    );

    expect(h.places.map((p) => p.name.toLowerCase())).toContain("ibiza");
    expect(h.adults?.value).toBe(4);
    expect(h.dates[0].month).toBe(8);
    expect(h.flags).toContain("beach");
    expect(h.budget).toBeUndefined();
  });
});

describe("preExtract · fechas", () => {
  it("rango con mes en letra", () => {
    const h = preExtract("del 12 al 16 de octubre");
    expect(h.dates[0].from).toMatch(/-10-12$/);
    expect(h.dates[0].to).toMatch(/-10-16$/);
  });

  it("rango numérico", () => {
    const h = preExtract("6/8 al 18/8");
    expect(h.dates[0].from).toMatch(/-08-06$/);
    expect(h.dates[0].to).toMatch(/-08-18$/);
  });

  it("mes pasado se resuelve al año siguiente", () => {
    const h = preExtract("en enero");
    const now = new Date();
    const expected =
      now.getMonth() + 1 > 1 ? now.getFullYear() + 1 : now.getFullYear();
    expect(h.dates[0].year).toBe(expected);
  });

  it("semana santa se resuelve a un mes plausible", () => {
    const h = preExtract("para semana santa");
    expect([3, 4]).toContain(h.dates[0].month);
  });
});

describe("preExtract · duración", () => {
  it('"5 días" son 4 noches', () => {
    expect(preExtract("5 días en Roma").nights?.value).toBe(4);
  });
  it('"5 noches" son 5 noches', () => {
    expect(preExtract("5 noches en Roma").nights?.value).toBe(5);
  });
  it('"fin de semana" son 2 noches', () => {
    expect(preExtract("escapada fin de semana a Lisboa").nights?.value).toBe(2);
  });
  it('"una semana" son 7 noches', () => {
    expect(preExtract("una semana en Cancún").nights?.value).toBe(7);
  });
});

describe("preExtract · viajeros", () => {
  it("resta niños del total de personas", () => {
    const h = preExtract("4 personas, 2 niños de 6 y 9 años");
    expect(h.adults?.value).toBe(2);
    expect(h.children?.ages.sort()).toEqual([6, 9]);
  });
  it("detecta pareja como 2 adultos", () => {
    expect(preExtract("viaje para una pareja a Praga").adults?.value).toBe(2);
  });
  it("no confunde el presupuesto con el número de personas", () => {
    const h = preExtract(
      "Ibiza para 4 personas, presupuesto 1200 € por persona",
    );
    expect(h.adults?.value).toBe(4);
    expect(h.budget?.amount).toBe(1200);
    expect(h.budget?.per).toBe("person");
  });
});

describe("preExtract · presupuesto", () => {
  it("detecta por persona", () => {
    const h = preExtract("unos 1500 € por persona");
    expect(h.budget).toEqual(
      expect.objectContaining({ amount: 1500, per: "person" }),
    );
  });
  it("detecta total", () => {
    const h = preExtract("presupuesto máximo 3.000 € en total");
    expect(h.budget).toEqual(
      expect.objectContaining({ amount: 3000, per: "total" }),
    );
  });
  it("ignora cifras absurdas", () => {
    expect(preExtract("el vuelo IB 3220 sale a las 7").budget).toBeUndefined();
  });
});
