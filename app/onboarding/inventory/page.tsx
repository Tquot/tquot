"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import Link from "next/link";
import { useSiteLanguage } from "@/app/language-provider";

export default function InventoryOnboardingPage() {
  const router = useRouter();
  const { t } = useSiteLanguage();
  const [pending, startTransition] = useTransition();

  function finish(skip: boolean) {
    startTransition(async () => {
      await fetch("/api/onboarding/step-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "inventory", data: { skipped: skip } }),
      });
      await fetch("/api/onboarding/step-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "complete" }),
      });
      router.push("/onboarding/complete");
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Eyebrow className="block">{t.onboardingInventoryEyebrow}</Eyebrow>
      <h1
        className="font-serif text-h1 text-ink"
        style={{ fontWeight: 500 }}
      >
        {t.onboardingInventoryTitle}
      </h1>
      <p className="text-body text-text-2">{t.onboardingInventoryBody}</p>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/inventory"
          className="inline-flex h-12 items-center rounded-md border border-border-2 px-6 text-body font-medium text-ink hover:border-border-3"
        >
          {t.onboardingGoInventory}
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => finish(true)}
          className="inline-flex h-12 items-center rounded-md bg-ink px-6 text-body font-medium text-paper hover:bg-ink-2 disabled:opacity-50"
        >
          {pending ? t.onboardingSaving : t.onboardingSkipAndFinish}
        </button>
      </div>
    </div>
  );
}
