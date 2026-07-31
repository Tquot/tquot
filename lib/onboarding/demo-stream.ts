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
import { tplAck } from "@/lib/agent/templates";
import { planMessage } from "@/lib/agent/planner";
import type { AgentMessage } from "@/lib/agent/types";
import { suggestionCtxFromQuote } from "@/lib/agent/context";

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
        const legId = parsed.legs[0]!.id;
        const emitted: AgentMessage[] = [];

        const openingId = nanoid();
        send({
          type: "narrator.message.start",
          messageId: openingId,
          phase: "opening",
          ts: Date.now(),
        });
        await sleep(DEMO_TIMINGS.opening);
        const ack = tplAck(parsed);
        emitted.push({
          id: openingId,
          kind: "ack",
          text: ack,
          createdAt: new Date().toISOString(),
        });
        send({
          type: "narrator.message.complete",
          messageId: openingId,
          content: ack,
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
        const flights = buildDemoFlights();
        const flightItems = demoFlightsToQuoteItems(flights);
        send({
          type: "section.done",
          section: "flights",
          legId,
          results: flightItems,
          ts: Date.now(),
        });
        // Silencio en section.done — BuildProgress ya informa.

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
        const comparatorEntries = buildDemoComparator(hotels[0]!.id);
        send({
          type: "section.partial",
          section: "hotels",
          legId,
          results: comparatorEntries,
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
        const ctx = suggestionCtxFromQuote(parsed, quote, {
          comparator: comparatorEntries
            .filter((e) => e.totalPrice != null || !e.available)
            .map((e) => ({
              provider: e.provider as
                | "hotelbeds"
                | "booking"
                | "expedia"
                | "ratehawk"
                | "own",
              source: "snapshot" as const,
              available: e.available,
              totalPrice: e.totalPrice ?? undefined,
              currency: e.currency,
              nights: 4,
              hotelName: hotels[0]!.name,
              fetchedAt: new Date().toISOString(),
              ageMinutes: 0,
            })),
        });
        ctx.candidates.flights = flights;
        ctx.candidates.hotels = hotels;
        ctx.candidates.experiences = buildDemoExperiences();

        const closeMessages = await planMessage({
          event: { type: "complete" },
          ctx,
          emitted,
        });

        for (const msg of closeMessages) {
          emitted.push(msg);
          send({
            type: "narrator.message.complete",
            messageId: msg.id,
            content: msg.text,
            phase: msg.kind === "suggestion" ? "progress" : "summary",
            ts: Date.now(),
            ...(msg.suggestion ? { suggestion: msg.suggestion } : {}),
          });
        }
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
