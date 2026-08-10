import { CompletionScreen } from "@/components/onboarding/CompletionScreen";
import { getCurrentAgencyId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { markStepComplete } from "@/lib/onboarding/progress";

export default async function CompletePage() {
  await markStepComplete({ step: "complete" });

  const agencyId = await getCurrentAgencyId();
  const supabase = await createServerSupabaseClient();
  let name = "";
  if (agencyId) {
    const { data } = await supabase
      .from("agencies")
      .select("name")
      .eq("id", agencyId)
      .maybeSingle();
    name = data?.name ?? "";
  }

  return <CompletionScreen agencyName={name} />;
}
