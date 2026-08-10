import { describe, it, expect } from "vitest";
import { verifyAll, verifyProvider } from "@/lib/recommendations/providers/verify";
import type { RawProvider } from "@/lib/recommendations/providers/types";

const base: RawProvider = {
  name: "Accessible Rome Tours",
  description:
    "Receptivo especializado en viajes para personas con discapacidad en Roma.",
  website: {
    value: "https://accessiblerometours.it",
    source_url: "https://accessiblerometours.it",
  },
  email: {
    value: "info@accessiblerometours.it",
    source_url: "https://accessiblerometours.it/contatti",
  },
  phone: {
    value: "+39 06 4544 2020",
    source_url: "https://accessiblerometours.it/contatti",
  },
  service_area: "Roma y Lacio",
  signals: [
    "3 furgonetas con plataforma elevadora",
    "Guías con formación en accesibilidad",
  ],
};

const opts = { destination: "Roma", countryCode: "IT" };

describe("verifyProvider · casos válidos", () => {
  it("acepta un proveedor con email y teléfono en su propio dominio", () => {
    const v = verifyProvider(base, "accessible", opts);
    expect(v).not.toBeNull();
    expect(v!.trust).toBe("verified");
    expect(v!.email!.confidence).toBe("verified");
    expect(v!.phone!.value).toBe("+39 06 4544 2020");
  });

  it("normaliza el teléfono a formato internacional", () => {
    const v = verifyProvider(
      {
        ...base,
        phone: {
          value: "06 4544 2020",
          source_url: "https://accessiblerometours.it/contatti",
        },
      },
      "accessible",
      opts,
    );
    expect(v!.phone!.value).toMatch(/^\+39/);
  });

  it("acepta correo gratuito leído en la web propia, marcado como probable", () => {
    const v = verifyProvider(
      {
        ...base,
        email: {
          value: "romatours@gmail.com",
          source_url: "https://accessiblerometours.it/contatti",
        },
      },
      "accessible",
      opts,
    );
    expect(v!.email!.confidence).toBe("probable");
    expect(v!.trust).toBe("probable");
  });
});

describe("verifyProvider · rechazos", () => {
  it("descarta el email si su dominio es de otra empresa", () => {
    const v = verifyProvider(
      {
        ...base,
        email: {
          value: "info@otraempresa.es",
          source_url: "https://accessiblerometours.it/contatti",
        },
      },
      "accessible",
      opts,
    );
    expect(v!.email).toBeNull();
  });

  it("descarta el teléfono si la fuente es un agregador", () => {
    const v = verifyProvider(
      {
        ...base,
        phone: {
          value: "+39 06 4544 2020",
          source_url: "https://www.tripadvisor.com/Attraction_Review",
        },
      },
      "accessible",
      opts,
    );
    expect(v!.phone).toBeNull();
  });

  it("descarta teléfonos de plantilla", () => {
    for (const fake of [
      "+34 91 XXX XX XX",
      "000 000 000",
      "123 456 789",
      "111111111",
    ]) {
      const v = verifyProvider(
        {
          ...base,
          phone: {
            value: fake,
            source_url: "https://accessiblerometours.it/contatti",
          },
        },
        "accessible",
        opts,
      );
      expect(v!.phone).toBeNull();
    }
  });

  it("descarta al proveedor entero si la web es un agregador", () => {
    const v = verifyProvider(
      {
        ...base,
        website: {
          value: "https://www.getyourguide.com/roma",
          source_url: "https://www.getyourguide.com/roma",
        },
      },
      "accessible",
      opts,
    );
    expect(v).toBeNull();
  });

  it("descarta al proveedor si no queda ningún canal de contacto", () => {
    const v = verifyProvider(
      { ...base, email: null, phone: null },
      "accessible",
      opts,
    );
    expect(v).toBeNull();
  });

  it("descarta un teléfono inválido para el país", () => {
    const v = verifyProvider(
      {
        ...base,
        phone: {
          value: "+39 1",
          source_url: "https://accessiblerometours.it/contatti",
        },
      },
      "accessible",
      opts,
    );
    expect(v!.phone).toBeNull();
  });
});

describe("verifyAll", () => {
  it("deduplica por dominio", () => {
    const dup = { ...base, name: "Accessible Rome Tours SRL" };
    const out = verifyAll([base, dup], "accessible", opts);
    expect(out).toHaveLength(1);
  });

  it("nunca devuelve más de 2", () => {
    const many = [1, 2, 3, 4].map((i) => ({
      ...base,
      name: `Operador ${i}`,
      website: {
        value: `https://operador${i}.it`,
        source_url: `https://operador${i}.it`,
      },
      email: {
        value: `info@operador${i}.it`,
        source_url: `https://operador${i}.it/contatti`,
      },
      phone: {
        value: "+39 06 4544 2020",
        source_url: `https://operador${i}.it/contatti`,
      },
    }));
    expect(verifyAll(many, "dmc", opts)).toHaveLength(2);
  });
});
