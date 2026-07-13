import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { buildQuoteWithProgress } from "@/lib/quote-engine/buildQuoteWithProgress";
import { parseParsedTripInputBody } from "@/lib/quote-engine/schemas";
import { narrateBuildEvent, narrateRecommendationEvent } from "@/lib/narrator/templates";
import { buildClarificationMessages } from "@/lib/narrator/clarification";
import {
  streamOpeningMessage,
  streamSummaryMessage,
} from "@/lib/narrator/synthesizer";
import { generateRecommendations } from "@/lib/recommendations/generate";
import type {
  ConversationStreamEvent,
  BuildEvent,
} from "@/lib/quote-conversation/types";
import type { Quote } from "@/lib/quote-engine/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.response) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = parseParsedTripInputBody(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "invalid_parsed_input",
        details: parsed.error,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());

  const collectedEvents: BuildEvent[] = [];
  const cookieHeader = req.headers.get("cookie") ?? undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: ConversationStreamEvent) => {
        const line = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          // stream closed
        }
      };

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ka\n\n`));
        } catch {
          // ignore
        }
      }, 15_000);

      try {
        const openingId = nanoid();
        send({
          type: "narrator.message.start",
          messageId: openingId,
          phase: "opening",
          ts: Date.now(),
        });

        await streamOpeningMessage(parsed.data, {
          signal: abort.signal,
          onDelta: (delta) =>
            send({
              type: "narrator.message.delta",
              messageId: openingId,
              delta,
              ts: Date.now(),
            }),
          onError: () => {},
        });

        send({
          type: "narrator.message.end",
          messageId: openingId,
          ts: Date.now(),
        });

        const clarifications = buildClarificationMessages(parsed.data);
        for (const content of clarifications) {
          send({
            type: "narrator.message.complete",
            messageId: nanoid(),
            content,
            phase: "clarification",
            ts: Date.now(),
          });
        }

        send({ type: "build.started", ts: Date.now() });

        const { loadAgencyCurrency } = await import("@/lib/currency/loader");
        const baseCurrency = await loadAgencyCurrency();

        const quote = await buildQuoteWithProgress(parsed.data, {
          signal: abort.signal,
          onEvent: (event) => {
            collectedEvents.push(event);
            send(event);

            const content = narrateBuildEvent(event, parsed.data);
            if (content) {
              send({
                type: "narrator.message.complete",
                messageId: nanoid(),
                content,
                phase: "progress",
                ts: Date.now(),
              });
            }
          },
          apiOrigin: req.nextUrl.origin,
          cookieHeader,
          baseCurrency,
        });

        send({ type: "build.done", quote, ts: Date.now() });

        const quoteWithRecs = quote as Quote;

        const recommendationsPromise = generateRecommendations({
          parsed: parsed.data,
          quote: quoteWithRecs,
          signal: abort.signal,
          onEvent: (event) => {
            if (event.type === "started") {
              send({
                type: "recommendation.started",
                category: event.category,
                legId: event.legId,
                ts: Date.now(),
              });
            }
            if (event.type === "done") {
              send({
                type: "recommendation.done",
                category: event.category,
                legId: event.legId,
                providers: event.providers,
                source: event.source,
                ts: Date.now(),
              });
              const narration = narrateRecommendationEvent({
                type: "recommendation.done",
                category: event.category,
                legId: event.legId,
                providers: event.providers,
                source: event.source,
                ts: Date.now(),
              });
              if (narration) {
                send({
                  type: "narrator.message.complete",
                  messageId: nanoid(),
                  content: narration,
                  phase: "progress",
                  ts: Date.now(),
                });
              }
            }
            if (event.type === "error") {
              send({
                type: "recommendation.error",
                category: event.category,
                legId: event.legId,
                error: event.error,
                ts: Date.now(),
              });
              const narration = narrateRecommendationEvent({
                type: "recommendation.error",
                category: event.category,
                legId: event.legId,
                error: event.error,
                ts: Date.now(),
              });
              if (narration) {
                send({
                  type: "narrator.message.complete",
                  messageId: nanoid(),
                  content: narration,
                  phase: "progress",
                  ts: Date.now(),
                });
              }
            }
          },
        });

        const summaryId = nanoid();
        send({
          type: "narrator.message.start",
          messageId: summaryId,
          phase: "summary",
          ts: Date.now(),
        });

        await streamSummaryMessage(parsed.data, quote, collectedEvents, {
          signal: abort.signal,
          onDelta: (delta) =>
            send({
              type: "narrator.message.delta",
              messageId: summaryId,
              delta,
              ts: Date.now(),
            }),
        });

        send({
          type: "narrator.message.end",
          messageId: summaryId,
          ts: Date.now(),
        });

        const recommendations = await recommendationsPromise;
        if (recommendations.length > 0) {
          quoteWithRecs.recommendations = recommendations;
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "unknown_error";
        send({ type: "build.error", error: message, ts: Date.now() });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // ignore
        }
      }
    },
    cancel() {
      abort.abort();
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
