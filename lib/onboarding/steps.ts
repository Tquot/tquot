export type OnboardingStep =
  | "welcome"
  | "identity"
  | "providers"
  | "first-quote"
  | "inventory"
  | "complete";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "identity",
  "providers",
  "first-quote",
  "inventory",
  "complete",
];
