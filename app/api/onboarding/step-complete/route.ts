import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import {
  markStepComplete,
  type OnboardingStep,
} from "@/lib/onboarding/progress";

const BodySchema = z.object({
  step: z.enum([
    "welcome",
    "identity",
    "providers",
    "first-quote",
    "inventory",
    "complete",
  ]),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const auth = await getAuthenticatedUserAndAgency();
  if ("response" in auth) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const row = await markStepComplete({
    step: parsed.data.step as OnboardingStep,
    data: parsed.data.data,
  });

  if (!row) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, onboarding: row });
}
