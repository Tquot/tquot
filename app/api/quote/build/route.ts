import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import { buildQuoteWithProgress } from "@/lib/quote-engine/buildQuoteWithProgress";
import { parseParsedTripInputBody } from "@/lib/quote-engine/schemas";
import type { BuildEvent } from "@/lib/quote-engine/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function encodeSseEvent(event: BuildEvent): string {
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

  const parsed = parseParsedTripInputBody(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "invalid_parsed_input", details: parsed.error }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const cookieHeader = req.headers.get("cookie") ?? undefined;

  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: BuildEvent) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15_000);

      try {
        await buildQuoteWithProgress(parsed.data, {
          signal: abort.signal,
          onEvent: send,
          apiOrigin: req.nextUrl.origin,
          cookieHeader,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const message = err instanceof Error ? err.message : "unknown_error";
        send({ type: "build.error", error: message, ts: Date.now() });
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
