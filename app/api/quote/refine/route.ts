import { NextRequest, NextResponse } from "next/server";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import { getAuthenticatedUser, validateAgentId } from "@/app/api/parser/_auth";
import { classifyRefinementRequest } from "@/lib/quotes/refine/classify";
import { RefineClassifyBodySchema } from "@/lib/quotes/refine/schema";

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.response) return auth.response;

  let body: {
    currentQuote: Quote;
    message: string;
    tripInput: ParsedTripInput;
    agentId: string;
  };

  try {
    const parsed = RefineClassifyBodySchema.parse(await req.json());
    body = {
      currentQuote: parsed.currentQuote,
      message: parsed.message,
      tripInput: parsed.tripInput,
      agentId: parsed.agentId,
    };
  } catch (err) {
    return NextResponse.json(
      { error: "Body inválido", details: (err as Error).message },
      { status: 400 },
    );
  }

  const agentError = validateAgentId(body.agentId, auth.user.id);
  if (agentError) return agentError;

  const action = await classifyRefinementRequest(
    body.message,
    body.currentQuote,
    body.tripInput,
  );

  return NextResponse.json({ action });
}
