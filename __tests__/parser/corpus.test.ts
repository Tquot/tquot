import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sanitize } from "@/lib/parser/sanitize";
import { preExtract } from "@/lib/parser/pre-extract";

const DIR = join(__dirname, "../fixtures/informal");

describe("corpus de mensajes reales", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".txt"));

  it("la pre-extracción cubre destino y pax en al menos el 70 % del corpus", () => {
    let covered = 0;
    for (const f of files) {
      const raw = readFileSync(join(DIR, f), "utf8");
      const h = preExtract(sanitize(raw).clean);
      if (h.places.length > 0 && h.adults != null) covered++;
    }
    const ratio = covered / files.length;
    expect(ratio).toBeGreaterThanOrEqual(0.7);
  });

  for (const f of files) {
    const expectedPath = join(DIR, "expected", f.replace(".txt", ".json"));
    if (!existsSync(expectedPath)) continue;

    it(`${f}: hints coinciden con lo esperado`, () => {
      const raw = readFileSync(join(DIR, f), "utf8");
      const expected = JSON.parse(readFileSync(expectedPath, "utf8")) as Record<
        string,
        unknown
      >;
      const h = preExtract(sanitize(raw).clean);

      for (const [key, value] of Object.entries(expected)) {
        expect(h[key as keyof typeof h]).toEqual(value);
      }
    });
  }
});
