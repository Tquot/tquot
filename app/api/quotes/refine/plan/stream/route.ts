import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { classifyRefinementIntent } from "@/lib/narrator/intent-classifier";
import { streamRefinementPlan } from "@/lib/narrator/synthesizer";
import {
  intentToOperation,
  estimateImpact,
} from "@/lib/quote-engine/refinement-planner";
import type {
  ConversationStreamEvent,
  PlannedRefinement,
} from "@/lib/quote-conversation/types";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  userInput: z.string().min(1).max(2000),
  quote: z.unknown(),
  parsed: z.unknown(),
});

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.response) {
    return auth.response;
  }

  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid_request" }), {
      status: 400,
    });
  }

  const { userInput } = parsed.data;
  const quote = parsed.data.quote as Quote;
  const parsedInput = parsed.data.parsed as ParsedTripInput;

  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: ConversationStreamEvent) => {
        const line = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(line));
        } catch {
          // ignore
        }
      };

      try {
        const intent = await classifyRefinementIntent(userInput, {
          destination: parsedInput.destination,
          checkIn: parsedInput.dates?.start,
          checkOut: parsedInput.dates?.end,
        });

        send({
          type: "refinement.intent_classified",
          intent,
          ts: Date.now(),
        });

        const operation = intentToOperation(intent, quote, parsedInput);

        const messageId = nanoid();
        send({
          type: "narrator.message.start",
          messageId,
          phase: "refinement_plan",
          ts: Date.now(),
        });

        const planText = await streamRefinementPlan(
          userInput,
          intent,
          parsedInput,
          quote,
          {
            signal: abort.signal,
            onDelta: (delta) =>
              send({
                type: "narrator.message.delta",
                messageId,
                delta,
                ts: Date.now(),
              }),
          },
        );

        send({
          type: "narrator.message.end",
          messageId,
          ts: Date.now(),
        });

        if (!operation) {
          send({
            type: "refinement.plan.not_actionable",
            reason:
              intent.kind === "free_text"
                ? "No detecté un cambio concreto en tu mensaje."
                : "El cambio pedido no tiene datos suficientes para ejecutar.",
            ts: Date.now(),
          });
          return;
        }

        const impact = estimateImpact(operation, quote);

        const plan: PlannedRefinement = {
          id: nanoid(),
          userInput,
          intent,
          planMessage: planText,
          operation,
          estimatedImpact: impact,
          createdAt: new Date().toISOString(),
        };

        send({
          type: "refinement.plan.ready",
          plan,
          ts: Date.now(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "plan_failed";
        send({
          type: "refinement.plan.error",
          error: message,
          ts: Date.now(),
        });
      } finally {
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
    },
  });
}
