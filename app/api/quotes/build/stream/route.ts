import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import type { Locale } from "@/app/dashboard/translations";
import { buildQuoteWithProgress } from "@/lib/quote-engine/buildQuoteWithProgress";
import { parseParsedTripInputBody } from "@/lib/quote-engine/schemas";
import { narrateBuildEvent, narrateRecommendationEvent } from "@/lib/narrator/templates";
import { buildClarificationMessages } from "@/lib/narrator/clarification";
import {
  generateExternalProviders,
  generateRecommendations,
} from "@/lib/recommendations/generate";
import type {
  ConversationStreamEvent,
  BuildEvent,
} from "@/lib/quote-conversation/types";
import type { Quote } from "@/lib/quote-engine/types";
import {
  isDemoBuildBody,
  streamDemoBuild,
} from "@/lib/onboarding/demo-stream";
import { planMessage } from "@/lib/agent/planner";
import type { AgentMessage } from "@/lib/agent/types";
import {
  emptySuggestionCtx,
  suggestionCtxFromQuote,
} from "@/lib/agent/context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function localeFromBody(body: unknown): Locale {
  if (
    body &&
    typeof body === "object" &&
    "locale" in body &&
    ((body as { locale?: unknown }).locale === "es" ||
      (body as { locale?: unknown }).locale === "en")
  ) {
    return (body as { locale: Locale }).locale;
  }
  return "es";
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.response) {
    return auth.response;
  }

  const supabase = await createServerSupabaseClient();
  const { data: agency } = await supabase
    .from("agencies")
    .select("id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  const agencyId = agency?.id ?? null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Demo mode: zero Claude / provider calls (onboarding + local UI work)
  if (isDemoBuildBody(body)) {
    return streamDemoBuild();
  }

  const locale = localeFromBody(body);

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
        const emitted: AgentMessage[] = [];

        // Template-first ack (0 tokens)
        const ackMessages = await planMessage({
          event: { type: "parsed", parsed: parsed.data },
          ctx: emptySuggestionCtx(parsed.data, { locale }),
          emitted,
        });
        for (const msg of ackMessages) {
          emitted.push(msg);
          send({
            type: "narrator.message.complete",
            messageId: msg.id,
            content: msg.text,
            phase: "opening",
            ts: Date.now(),
          });
        }

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
        const rawRequest =
          "rawInput" in parsed.data &&
          typeof parsed.data.rawInput === "string"
            ? parsed.data.rawInput
            : null;

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

        const externalProvidersPromise = (async () => {
          if (!agencyId) return [];
          send({ type: "external_providers.started", ts: Date.now() });
          try {
            const blocks = await generateExternalProviders({
              parsed: parsed.data,
              agencyId,
              rawRequest,
              signal: abort.signal,
            });
            send({
              type: "external_providers.done",
              blocks,
              ts: Date.now(),
            });
            return blocks;
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "external_providers_failed";
            send({
              type: "external_providers.error",
              error: message,
              ts: Date.now(),
            });
            return [];
          }
        })();

        const closeCtx = suggestionCtxFromQuote(parsed.data, quoteWithRecs, {
          locale,
        });
        const closeMessages = await planMessage({
          event: { type: "complete" },
          ctx: closeCtx,
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

        const [recommendations, externalProviders] = await Promise.all([
          recommendationsPromise,
          externalProvidersPromise,
        ]);
        if (recommendations.length > 0) {
          quoteWithRecs.recommendations = recommendations;
        }
        if (externalProviders.length > 0) {
          quoteWithRecs.externalProviders = externalProviders;
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
