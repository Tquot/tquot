import { describe, it, expect } from "vitest";
import { MAX_CHARS } from "@/lib/agent/types";
import { BANNED_LEXICON_PATTERN } from "@/lib/agent/lexicon";
import * as T from "@/lib/agent/templates";
import { createTestParsedInput } from "./helpers/factories";

describe("voz del agente · plantillas", () => {
  it("tplAck respeta el límite y no usa léxico prohibido", () => {
    const parsed = createTestParsedInput({
      destination: "Roma",
      nights: 4,
      adults: 2,
    });
    const text = T.tplAck(parsed);

    expect(text.length).toBeLessThanOrEqual(MAX_CHARS.ack);
    expect(text).not.toMatch(BANNED_LEXICON_PATTERN);
    expect(text).toContain("Roma");
    expect(text).toContain("4 noches");
  });

  it("tplAck con multi-leg nombra los destinos", () => {
    const parsed = createTestParsedInput({
      legs: [
        { destination: "Tokio", nights: 5 },
        { destination: "Kioto", nights: 3 },
      ],
    });
    const text = T.tplAck(parsed);

    expect(text).toContain("Tokio");
    expect(text).toContain("Kioto");
    expect(text).toContain("8 noches");
    expect(text.length).toBeLessThanOrEqual(MAX_CHARS.ack);
  });

  it("tplClosePlain cabe en el límite con datos largos", () => {
    const text = T.tplClosePlain({
      totalPrice: 12480,
      currency: "EUR",
      pax: 4,
      topHotel: {
        name: "Grand Hotel Excelsior Vittoria Sorrento",
        netPrice: 620,
      },
      topFlight: { carrier: "IB", price: 340 },
      notes: [],
    });
    expect(text.length).toBeLessThanOrEqual(MAX_CHARS.close);
  });

  it("tplCloseWithNote descarta la nota si no cabe", () => {
    const facts = {
      totalPrice: 12480,
      currency: "EUR",
      pax: 4,
      topHotel: {
        name: "Grand Hotel Excelsior Vittoria Sorrento",
        netPrice: 620,
      },
      topFlight: { carrier: "IB", price: 340 },
      notes: [
        "una nota extremadamente larga que desde luego no va a caber en el límite de doscientos cuarenta caracteres junto con todo lo demás que ya ocupa bastante",
      ],
    };
    const text = T.tplCloseWithNote(facts);
    expect(text.length).toBeLessThanOrEqual(MAX_CHARS.close);
  });

  it("tplRevisionAck es corto y dice qué se rehace", () => {
    const text = T.tplRevisionAck("nights", "3 noches", ["hotels", "flights"]);
    expect(text.length).toBeLessThanOrEqual(MAX_CHARS.revision_ack);
    expect(text).toContain("3 noches");
    expect(text).toContain("hoteles");
  });
});
