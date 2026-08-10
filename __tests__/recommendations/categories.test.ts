import { describe, it, expect } from "vitest";
import { detectCategories } from "@/lib/recommendations/providers/categories";
import { createTestParsedInput } from "../helpers/factories";

const parsed = createTestParsedInput({ destination: "Roma" });

describe("detectCategories", () => {
  it("detecta accesibilidad por el texto de la petición", () => {
    const c = detectCategories({
      parsed,
      raw: "viaje a roma, mi madre usa silla de ruedas",
      agencyAccessibilityDefault: false,
    });
    expect(c[0]).toBe("accessible");
  });

  it("detecta accesibilidad por la preferencia de la agencia aunque no se mencione", () => {
    const c = detectCategories({
      parsed,
      raw: "roma 4 noches",
      agencyAccessibilityDefault: true,
    });
    expect(c).toContain("accessible");
  });

  it("la accesibilidad va siempre primera", () => {
    const c = detectCategories({
      parsed,
      raw: "ruta del vino en la rioja con movilidad reducida",
      agencyAccessibilityDefault: false,
    });
    expect(c[0]).toBe("accessible");
    expect(c).toContain("wine");
  });

  it("devuelve receptivo general si no hay señal temática", () => {
    expect(
      detectCategories({
        parsed,
        raw: "roma 4 noches 2 adultos",
        agencyAccessibilityDefault: false,
      }),
    ).toEqual(["dmc"]);
  });

  it("nunca devuelve más de dos categorías", () => {
    const c = detectCategories({
      parsed,
      raw: "enoturismo, gastronomía, buceo, senderismo y visitas guiadas",
      agencyAccessibilityDefault: false,
    });
    expect(c.length).toBeLessThanOrEqual(2);
  });
});
