import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ParserEngine } from "@/lib/parser/engine";
import { getSessionStore } from "@/lib/parser/session";

const MAX_QUESTION_ROUNDS = Number(process.env.PARSER_MAX_QUESTION_ROUNDS ?? 2);

const RequestBodySchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
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
  const session = await store.load(body.sessionId);

  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  if (session.status === "ready") {
    return NextResponse.json({ error: "Sesión ya completada", session }, { status: 409 });
  }

  if (!session.partialData) {
    return NextResponse.json(
      { error: "Sesión sin datos parciales; iniciar con /api/parser/parse" },
      { status: 409 }
    );
  }

  session.turns.push({
    role: "agent",
    content: body.answers,
    timestamp: Date.now(),
  });

  const engine = new ParserEngine();
  const result = await engine.merge(session.partialData, body.answers);

  session.turns.push({
    role: "parser",
    content: result,
    timestamp: Date.now(),
  });

  if (result.status === "needs_input") {
    // Si superamos el máximo de rondas, forzamos "ready" con lo que haya
    // y dejamos que un humano revise. Decisión conservadora: no atrapamos
    // al agente en un bucle infinito de preguntas.
    if (session.questionRounds >= MAX_QUESTION_ROUNDS) {
      session.partialData = result.partialData;
      session.pendingQuestions = [];
      session.status = "ready";
      await store.save(session);
      return NextResponse.json({
        sessionId: session.id,
        status: "ready",
        data: result.partialData,
        promptVersion: result.promptVersion,
        warning: "Máximo de rondas alcanzado. Revisar manualmente datos incompletos.",
      });
    }

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
