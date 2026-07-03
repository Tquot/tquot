import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { parseWithProgress } from "@/lib/quote-engine/parseWithProgress";
import { ParseRequestSchema } from "@/lib/quote-engine/schemas";
import type { ParseEvent } from "@/lib/quote-engine/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function encodeSseEvent(event: ParseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

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

  const parsedBody = ParseRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return new Response(
      JSON.stringify({
        error: "invalid_request",
        details: parsedBody.error.message,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: ParseEvent) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15_000);

      try {
        await parseWithProgress(parsedBody.data.text, {
          signal: abort.signal,
          onEvent: send,
          currentDate: parsedBody.data.currentDate,
          languageHint: parsedBody.data.languageHint,
          locale: parsedBody.data.locale ?? "es",
          previousPartial: parsedBody.data.previousPartial,
          previousQuestions: parsedBody.data.questions,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "unknown_error";
        send({ type: "parse.error", error: message, ts: Date.now() });
      } finally {
        clearInterval(heartbeat);
        controller.close();
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
