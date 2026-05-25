import { NextRequest, NextResponse } from "next/server";
import type { ParsedTripInput, Quote } from "@/lib/quotes/build-quote";
import { getAuthenticatedUser } from "@/app/api/parser/_auth";
import {
  applyServerRefinementAction,
} from "@/lib/quotes/refine/apply";
import { RefineApplyBodySchema } from "@/lib/quotes/refine/schema";
import type { RefineAction } from "@/lib/quotes/refine/types";
import { isServerRefinementAction } from "@/lib/quotes/refine/utils";

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (auth.response) return auth.response;

  let body: {
    action: RefineAction;
    currentQuote: Quote;
    tripInput: ParsedTripInput;
  };

  try {
    const parsed = RefineApplyBodySchema.parse(await req.json());
    body = {
      action: parsed.action,
      currentQuote: parsed.currentQuote,
      tripInput: parsed.tripInput,
    };
  } catch (err) {
    return NextResponse.json(
      { error: "Body inválido", details: (err as Error).message },
      { status: 400 },
    );
  }

  if (!isServerRefinementAction(body.action)) {
    return NextResponse.json(
      { error: "Acción no ejecutable en servidor." },
      { status: 400 },
    );
  }

  const result = await applyServerRefinementAction(body.action, {
    userId: auth.user.id,
    tripInput: body.tripInput,
    currentQuote: body.currentQuote,
    apiOrigin: req.nextUrl.origin,
  });

  return NextResponse.json(result);
}
