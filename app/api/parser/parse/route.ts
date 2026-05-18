import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { anonymizeForClaude } from "@/lib/parser/anonymize";
import { ParserEngine } from "@/lib/parser/engine";
import {
  runParserSearchOrchestrator,
  shouldRequireHumanReview,
} from "@/lib/parser/search-orchestrator";
import { getSessionStore } from "@/lib/parser/session";
import { getAuthenticatedUser, validateAgentId } from "../_auth";

const MAX_INPUT_CHARS = Number(process.env.PARSER_MAX_INPUT_CHARS ?? 8000);

const RequestBodySchema = z.object({
  text: z.string().min(1).max(MAX_INPUT_CHARS),
  agentId: z.string(),
  currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const TEST_AGENT_ID = "test-agent";

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.response) return auth.response;

  let body: z.infer<typeof RequestBodySchema>;
  try {
    body = RequestBodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Body inválido", details: (err as Error).message },
      { status: 400 },
    );
  }

  const anonymizedText = anonymizeForClaude(body.text);

  if (body.agentId !== TEST_AGENT_ID) {
    const agentError = validateAgentId(body.agentId, auth.user.id);
    if (agentError) return agentError;
  }

  const store = getSessionStore();
  const session = await store.create(body.agentId);
  session.rawInputs.push(body.text);
  session.turns.push({
    role: "agent",
    content: body.text,
    timestamp: Date.now(),
  });

  const engine = new ParserEngine();
  const result = await engine.parse(anonymizedText, body.currentDate);

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
    session.searchResults = await runParserSearchOrchestrator(
      result.data,
      req.nextUrl.origin,
    );
    session.humanReviewRequired = shouldRequireHumanReview(result.data);
    session.humanReviewReason = session.humanReviewRequired
      ? "La solicitud incluye necesidades de accesibilidad."
      : undefined;
    session.status = "ready";
  } else {
    session.status = "error";
  }

  await store.save(session);

  return NextResponse.json({
    sessionId: session.id,
    searchResults: session.searchResults,
    humanReviewRequired: session.humanReviewRequired ?? false,
    humanReviewReason: session.humanReviewReason,
    ...result,
  });
}
