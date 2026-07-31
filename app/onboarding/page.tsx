import { redirect } from "next/navigation";
import {
  getOrCreateOnboarding,
  stepPath,
  type OnboardingStep,
} from "@/lib/onboarding/progress";

export default async function OnboardingIndexPage() {
  const onboarding = await getOrCreateOnboarding();
  const step = (onboarding?.current_step ?? "welcome") as OnboardingStep;
  redirect(stepPath(step));
}
