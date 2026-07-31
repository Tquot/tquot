import "server-only";

import { getCurrentAgencyId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "./steps";

export type { OnboardingStep };
export { ONBOARDING_STEPS };
export interface AgencyOnboardingRow {
  agency_id: string;
  current_step: OnboardingStep;
  completed_steps: string[];
  demo_mode: boolean;
  first_quote_id: string | null;
  connected_providers: string[];
  reminder_sent_at: string | null;
}

export async function getOrCreateOnboarding(
  agencyId?: string,
): Promise<AgencyOnboardingRow | null> {
  const supabase = await createServerSupabaseClient();
  const id = agencyId ?? (await getCurrentAgencyId());
  if (!id) return null;

  const { data: existing } = await supabase
    .from("agency_onboarding")
    .select("*")
    .eq("agency_id", id)
    .maybeSingle();

  if (existing) return existing as AgencyOnboardingRow;

  const { data: created, error } = await supabase
    .from("agency_onboarding")
    .insert({ agency_id: id })
    .select("*")
    .single();

  if (error) {
    console.error("[onboarding] create failed", error);
    return null;
  }
  return created as AgencyOnboardingRow;
}

export async function markStepComplete(input: {
  step: OnboardingStep;
  data?: Record<string, unknown>;
}): Promise<AgencyOnboardingRow | null> {
  const supabase = await createServerSupabaseClient();
  const agencyId = await getCurrentAgencyId();
  if (!agencyId) return null;

  const row = await getOrCreateOnboarding(agencyId);
  if (!row) return null;

  const completed = Array.from(
    new Set([...(row.completed_steps ?? []), input.step]),
  );
  const stepIndex = ONBOARDING_STEPS.indexOf(input.step);
  const next =
    stepIndex >= 0 && stepIndex < ONBOARDING_STEPS.length - 1
      ? ONBOARDING_STEPS[stepIndex + 1]
      : "complete";

  const patch: Record<string, unknown> = {
    completed_steps: completed,
    current_step: next,
    updated_at: new Date().toISOString(),
  };

  if (input.data?.demo === true) patch.demo_mode = true;
  if (typeof input.data?.quoteId === "string") {
    patch.first_quote_id = input.data.quoteId;
  }
  if (Array.isArray(input.data?.connectedProviders)) {
    patch.connected_providers = input.data.connectedProviders;
  }

  if (input.step === "complete" || next === "complete") {
    await supabase
      .from("agencies")
      .update({
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: "complete",
      })
      .eq("id", agencyId);
  } else {
    await supabase
      .from("agencies")
      .update({ onboarding_step: next })
      .eq("id", agencyId);
  }

  const { data, error } = await supabase
    .from("agency_onboarding")
    .update(patch)
    .eq("agency_id", agencyId)
    .select("*")
    .single();

  if (error) {
    console.error("[onboarding] markStepComplete failed", error);
    return null;
  }
  return data as AgencyOnboardingRow;
}

export function stepPath(step: OnboardingStep): string {
  switch (step) {
    case "welcome":
      return "/onboarding/welcome";
    case "identity":
      return "/onboarding/identity";
    case "providers":
      return "/onboarding/providers";
    case "first-quote":
      return "/onboarding/first-quote";
    case "inventory":
      return "/onboarding/inventory";
    case "complete":
      return "/onboarding/complete";
  }
}
