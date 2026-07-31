"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { QuoteConversation } from "@/app/dashboard/new-quote/QuoteConversation";
import { useQuoteConversationStore } from "@/lib/quote-conversation/store";
import { DEMO_SUGGESTION } from "@/lib/onboarding/constants";
import type { AgencyBookingConfig } from "@/lib/booking-handoff/types";

interface Props {
  demo: boolean;
  connectedProviders: string[];
  suggestion?: string;
  agencyConfig: AgencyBookingConfig;
}

function PrimingScreen({
  demo,
  connectedProviders,
  suggestion,
  onLaunch,
}: {
  demo: boolean;
  connectedProviders: string[];
  suggestion: string;
  onLaunch: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Eyebrow className="block">Paso 04 · Primera cotización</Eyebrow>
      <h1
        className="font-serif text-h1 text-ink"
        style={{ fontWeight: 500 }}
      >
        {demo ? "Cotización demo: Roma en 4 noches." : "Tu primera cotización."}
      </h1>
      <p className="text-body text-text-2">
        {demo
          ? "Sin Claude ni proveedores reales. Verás el canvas real con datos pre-cocinados."
          : connectedProviders.length > 0
            ? `Usaremos ${connectedProviders.join(", ")} para buscar.`
            : "Escribe una petición como se la pediría un cliente."}
      </p>
      <blockquote className="border-l-2 border-accent pl-4 text-body text-text">
        {suggestion}
      </blockquote>
      <button
        type="button"
        onClick={onLaunch}
        className="inline-flex h-12 items-center rounded-md bg-ink px-6 text-body font-medium text-paper hover:bg-ink-2"
      >
        {demo ? "Lanzar demo" : "Empezar"}
      </button>
    </div>
  );
}

export function FirstQuoteGuided({
  demo,
  connectedProviders,
  suggestion = DEMO_SUGGESTION,
  agencyConfig,
}: Props) {
  const router = useRouter();
  const [launched, setLaunched] = useState(false);
  const [pending, startTransition] = useTransition();

  const status = useQuoteConversationStore((s) => s.state.status);
  const quote = useQuoteConversationStore((s) =>
    s.state.status === "complete" ? s.state.quote : null,
  );
  const isComplete = status === "complete" && quote != null;

  function finish() {
    startTransition(async () => {
      await fetch("/api/onboarding/step-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "first-quote",
          data: {
            demo,
            quoteId:
              quote && "id" in quote ? (quote.id as string) : null,
          },
        }),
      });
      router.push("/onboarding/inventory");
    });
  }

  if (!launched) {
    return (
      <PrimingScreen
        demo={demo}
        connectedProviders={connectedProviders}
        suggestion={suggestion}
        onLaunch={() => setLaunched(true)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Eyebrow className="block">Paso 04 · Primera cotización</Eyebrow>

      <div className="overflow-hidden rounded-lg border border-border-1 bg-paper">
        <QuoteConversation
          agencyConfig={agencyConfig}
          embedded
          demo={demo}
          initialMessage={suggestion}
          autoStart
        />
      </div>

      {isComplete ? (
        <div className="flex animate-slide-up-fade flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={finish}
            disabled={pending}
            className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-6 text-body font-medium text-paper transition-colors hover:bg-ink-2 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Continuar"}
          </button>
          <span className="text-body-sm text-text-3">
            El siguiente paso es opcional.
          </span>
        </div>
      ) : null}
    </div>
  );
}
