"use client";

import {
  useQuoteConversationStore,
  selectActivePlan,
} from "@/lib/quote-conversation/store";
import { useRefinementPlan } from "@/hooks/useRefinementPlan";

export function RefinementConfirmation() {
  const plan = useQuoteConversationStore(selectActivePlan);
  const { confirmPlan, cancelPlan } = useRefinementPlan();

  if (!plan) return null;

  const impact = plan.estimatedImpact.priceChangeEstimate;
  const directionLabel: Record<string, string> = {
    up: "↑ más caro",
    down: "↓ más económico",
    unknown: "impacto incierto",
  };

  return (
    <div className="mx-4 my-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Confirmar cambio
        </div>
        {impact ? (
          <div className="text-xs text-amber-700">
            {directionLabel[impact.direction]} · estimado {impact.min} – {impact.max}{" "}
            {impact.currency}
          </div>
        ) : null}
      </div>

      <div className="mb-3 text-xs text-neutral-600">
        {plan.estimatedImpact.reasoning}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={confirmPlan}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Sí, hazlo
        </button>
        <button
          type="button"
          onClick={cancelPlan}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium transition hover:bg-neutral-50"
        >
          Cancelar
        </button>
        <div className="flex-1 self-center pr-1 text-right text-xs text-neutral-500">
          O escribe abajo para ajustar el plan
        </div>
      </div>
    </div>
  );
}
