import { FirstQuoteGuided } from "@/components/onboarding/FirstQuoteGuided";
import { loadBookingConfig } from "@/lib/booking-handoff/config";
import { getOrCreateOnboarding } from "@/lib/onboarding/progress";
import { DEMO_SUGGESTION } from "@/lib/onboarding/constants";

interface PageProps {
  searchParams: Promise<{ demo?: string }>;
}

export default async function FirstQuotePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const onboarding = await getOrCreateOnboarding();
  const demo =
    params.demo === "1" || params.demo === "true" || Boolean(onboarding?.demo_mode);
  const agencyConfig = await loadBookingConfig();

  return (
    <FirstQuoteGuided
      demo={demo}
      connectedProviders={onboarding?.connected_providers ?? []}
      suggestion={DEMO_SUGGESTION}
      agencyConfig={agencyConfig}
    />
  );
}
