import "server-only";

import { nanoid } from "nanoid";
import { composeQuote } from "@/lib/quote-engine/internal";
import type { ConversationStreamEvent } from "@/lib/quote-conversation/types";
import {
  buildDemoComparator,
  buildDemoExperiences,
  buildDemoFlights,
  buildDemoHotels,
  buildDemoParsed,
  demoExperiencesToQuoteItems,
  demoFlightsToQuoteItems,
  demoHotelsToQuoteItems,
} from "./demo-data";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Latencias calibradas al ~80 % de las reales.
 * Instantáneo = sospechoso; lento = aburre.
 */
const DEMO_TIMINGS = {
  opening: 600,
  flights: 800,
  hotels: 1600,
  experiences: 700,
  summary: 500,
};

function encode(event: ConversationStreamEvent): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
  );
}

/**
 * Demo build: cero llamadas a Claude / proveedores.
 * Emite el mismo protocolo SSE que /api/quotes/build/stream.
 */
export function streamDemoBuild(): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ConversationStreamEvent) => {
        try {
          controller.enqueue(encode(event));
        } catch {
          // stream closed
        }
      };

      try {
        const parsed = buildDemoParsed();
        const legId = parsed.legs[0].id;

        const openingId = nanoid();
        send({
          type: "narrator.message.start",
          messageId: openingId,
          phase: "opening",
          ts: Date.now(),
        });
        await sleep(DEMO_TIMINGS.opening);
        send({
          type: "narrator.message.complete",
          messageId: openingId,
          content: "Roma, 4 noches, 2 adultos. Zona Trastevere. Voy.",
          phase: "opening",
          ts: Date.now(),
        });
        send({
          type: "narrator.message.end",
          messageId: openingId,
          ts: Date.now(),
        });

        send({ type: "build.started", ts: Date.now() });

        send({
          type: "section.started",
          section: "flights",
          legId,
          ts: Date.now(),
        });
        send({
          type: "section.started",
          section: "hotels",
          legId,
          ts: Date.now(),
        });
        send({
          type: "section.started",
          section: "experiences",
          legId,
          ts: Date.now(),
        });

        await sleep(DEMO_TIMINGS.flights);
        const flightItems = demoFlightsToQuoteItems(buildDemoFlights());
        send({
          type: "section.done",
          section: "flights",
          legId,
          results: flightItems,
          ts: Date.now(),
        });
        send({
          type: "narrator.message.complete",
          messageId: nanoid(),
          content: `Encontré ${flightItems.length} vuelos MAD → FCO.`,
          phase: "progress",
          ts: Date.now(),
        });

        await sleep(DEMO_TIMINGS.hotels);
        const hotels = buildDemoHotels();
        const hotelItems = demoHotelsToQuoteItems(hotels);
        send({
          type: "section.done",
          section: "hotels",
          legId,
          results: hotelItems,
          ts: Date.now(),
        });
        send({
          type: "narrator.message.complete",
          messageId: nanoid(),
          content: `${hotelItems.length} hoteles en Roma, con regímenes SA/AD/MP.`,
          phase: "progress",
          ts: Date.now(),
        });

        // Comparator payload for UI consumers that listen for it
        send({
          type: "section.partial",
          section: "hotels",
          legId,
          results: [
            {
              __demoComparator: true,
              hotelId: hotels[0].id,
              entries: buildDemoComparator(hotels[0].id),
            },
          ],
          ts: Date.now(),
        });

        await sleep(DEMO_TIMINGS.experiences);
        const experienceItems = demoExperiencesToQuoteItems(
          buildDemoExperiences(),
        );
        send({
          type: "section.done",
          section: "experiences",
          legId,
          results: experienceItems,
          ts: Date.now(),
        });

        const quote = composeQuote(parsed, {
          flights: flightItems,
          hotels: hotelItems,
          experiences: experienceItems,
          transfers: [],
        });

        send({ type: "build.done", quote, ts: Date.now() });

        await sleep(DEMO_TIMINGS.summary);
        const summaryId = nanoid();
        send({
          type: "narrator.message.start",
          messageId: summaryId,
          phase: "summary",
          ts: Date.now(),
        });
        send({
          type: "narrator.message.complete",
          messageId: summaryId,
          content: `Vuelo IB 124 €, Hotel de Russie a 312 €/noche. Total 2 personas: ${Math.round(quote.pricing.finalTotal).toLocaleString("es-ES")} €.`,
          phase: "summary",
          ts: Date.now(),
        });
        send({
          type: "narrator.message.end",
          messageId: summaryId,
          ts: Date.now(),
        });

        send({
          type: "narrator.message.complete",
          messageId: nanoid(),
          content:
            "Sugerencia: sin seguro de viaje. Básico para 2 pax: 96 €. Puedes añadirlo al refinar.",
          phase: "progress",
          ts: Date.now(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "demo_error";
        send({ type: "build.error", error: message, ts: Date.now() });
      } finally {
        try {
          controller.close();
        } catch {
          // ignore
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export function isDemoBuildBody(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "demo" in body &&
    (body as { demo?: unknown }).demo === true
  );
}
