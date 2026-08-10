import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { OnboardingLayoutSubtitle } from "@/components/onboarding/OnboardingLayoutSubtitle";
import {
  getOrCreateOnboarding,
  type OnboardingStep,
} from "@/lib/onboarding/progress";
import { ensureAgencyForUser } from "@/lib/onboarding/ensure-agency";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureAgencyForUser();
  const onboarding = await getOrCreateOnboarding();
  const current = (onboarding?.current_step ?? "welcome") as OnboardingStep;

  return (
    <div className="min-h-screen bg-paper text-text">
      <header className="border-b border-border-1">
        <div className="mx-auto flex h-14 max-w-[720px] items-center px-6">
          <span className="font-mono text-mono-md font-semibold tracking-tight text-ink">
            TQUOT
          </span>
          <OnboardingLayoutSubtitle />
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-6 py-10">
        <ProgressBar current={current} />
        {children}
      </main>
    </div>
  );
}
