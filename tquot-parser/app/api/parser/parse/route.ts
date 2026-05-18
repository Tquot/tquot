import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ParserEngine } from "@/lib/parser/engine";
import { getSessionStore } from "@/lib/parser/session";

const MAX_INPUT_CHARS = Number(process.env.PARSER_MAX_INPUT_CHARS ?? 8000);

const RequestBodySchema = z.object({
  text: z.string().min(1).max(MAX_INPUT_CHARS),
  agentId: z.string().nullable().optional(),
  currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof RequestBodySchema>;
  try {
    body = RequestBodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Body inválido", details: (err as Error).message },
      { status: 400 }
    );
  }

  const store = getSessionStore();
  const session = await store.create(body.agentId ?? null);
  session.rawInputs.push(body.text);
  session.turns.push({
    role: "agent",
    content: body.text,
    timestamp: Date.now(),
  });

  const engine = new ParserEngine();
  const result = await engine.parse(body.text, body.currentDate);

  session.turns.push({
    role: "parser",
    content: result,
    timestamp: Date.now(),
  });

  if (result.status === "needs_input") {
    session.partialData = result.partialData;
    session.pendingQuestions = result.questions;
    session.status = "awaiting_answers";
    session.questionRounds += 1;
  } else if (result.status === "ready") {
    session.partialData = result.data;
    session.pendingQuestions = [];
    session.status = "ready";
  } else {
    session.status = "error";
  }

  await store.save(session);

  return NextResponse.json({
    sessionId: session.id,
    ...result,
  });
}
