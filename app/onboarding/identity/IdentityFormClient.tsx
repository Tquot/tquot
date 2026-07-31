"use client";

import { useRouter } from "next/navigation";
import { AgencyForm } from "@/components/onboarding/AgencyForm";
import { saveIdentityAction } from "./actions";

interface Props {
  initialName: string;
  initialPrimary: string;
  initialAccent: string;
  initialAccessibilityDefault: boolean;
}

export function IdentityFormClient(props: Props) {
  const router = useRouter();

  return (
    <AgencyForm
      {...props}
      onSubmit={async (data) => {
        const result = await saveIdentityAction(data);
        if (!result.ok) throw new Error(result.error);
        router.push("/onboarding/providers");
      }}
    />
  );
}
