import { describe, it, expect } from "vitest";
import { preExtract } from "@/lib/parser/pre-extract";
import { shouldCallModel } from "@/lib/parser/should-call-model";

describe("shouldCallModel · ahorro de tokens", () => {
  const cases: Array<[string, boolean]> = [
    [
      "hola quería saber precio ibiza agosto 4 personas algo en playa",
      false,
    ],
    ["Roma del 12 al 16 octubre 2 adultos", false],
    ["4 personas Cancún una semana en julio", false],
    ["Madrid → Tokio 5 noches → Kioto 3 noches, 2 adultos", true],
    [
      "quiero ir a Ibiza pero si no hay nada en playa mejor Menorca, somos 4",
      true,
    ],
    ["algo bonito para agosto, no sé, 4 personas", true],
    ["Ibiza agosto", true],
  ];

  for (const [msg, expected] of cases) {
    it(`${expected ? "llama" : "salta"} el modelo: "${msg.slice(0, 45)}…"`, () => {
      expect(shouldCallModel(preExtract(msg), msg)).toBe(expected);
    });
  }
});
