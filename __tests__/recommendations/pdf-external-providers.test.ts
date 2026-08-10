import { describe, it, expect } from "vitest";
import { shouldRenderExternalProvidersOnPdf } from "@/lib/pdf/external-providers-guard";
import type { ProviderBlock } from "@/lib/recommendations/providers/types";

const blocksWithProviders: ProviderBlock[] = [
  {
    category: "accessible",
    destination: "Roma",
    providers: [
      {
        id: "accessible:example.it",
        category: "accessible",
        destination: "Roma",
        name: "Example",
        description: "Operador de prueba con descripción suficientemente larga.",
        website: {
          value: "https://example.it",
          sourceUrl: "https://example.it",
          confidence: "verified",
        },
        email: {
          value: "info@example.it",
          sourceUrl: "https://example.it/contact",
          confidence: "verified",
        },
        phone: null,
        serviceArea: null,
        signals: [],
        checkedAt: new Date().toISOString(),
        trust: "probable",
      },
    ],
    noResultsReason: null,
  },
];

describe("shouldRenderExternalProvidersOnPdf", () => {
  it("never renders external providers on the client PDF", () => {
    expect(
      shouldRenderExternalProvidersOnPdf("client", blocksWithProviders),
    ).toBe(false);
  });

  it("renders on agent PDF when there are providers", () => {
    expect(
      shouldRenderExternalProvidersOnPdf("agent", blocksWithProviders),
    ).toBe(true);
  });

  it("skips empty blocks on agent PDF", () => {
    expect(
      shouldRenderExternalProvidersOnPdf("agent", [
        {
          category: "dmc",
          destination: "Roma",
          providers: [],
          noResultsReason: "Ninguno",
        },
      ]),
    ).toBe(false);
  });
});
