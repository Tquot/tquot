"use client";

import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";

export default function WelcomePage() {
  const router = useRouter();

  async function complete(demo: boolean) {
    await fetch("/api/onboarding/step-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: "welcome",
        data: demo ? { demo: true } : {},
      }),
    });
    router.push(
      demo ? "/onboarding/first-quote?demo=1" : "/onboarding/identity",
    );
  }

  return (
    <WelcomeScreen
      onStartLive={() => void complete(false)}
      onStartDemo={() => void complete(true)}
    />
  );
}
