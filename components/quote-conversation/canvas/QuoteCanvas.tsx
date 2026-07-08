"use client";

import { useQuoteConversationStore, selectStatus } from "@/lib/quote-conversation/store";
import { toParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { ParsedTripInput } from "@/lib/quotes/build-quote";
import { LegBlock } from "./LegBlock";
import { selectCurrentQuote } from "@/lib/quote-conversation/store";

function ParsingPreview({
  state,
}: {
  state: { status: "parsing"; partial: Partial<ParsedTripInput> };
}) {
  return (
    <div className="p-6 text-sm text-neutral-600">
      <p className="font-medium text-neutral-900">Entendiendo la petición…</p>
      <p className="mt-2">
        Destino: {state.partial.destination ?? "—"}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center text-sm text-neutral-500">
      Escribe una petición de viaje para empezar.
    </div>
  );
}

function QuoteSummary() {
  const quote = useQuoteConversationStore((s) =>
    s.state.status === "complete" ? s.state.quote : null,
  );

  if (!quote) return null;

  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Resumen</h3>
      <p className="mt-1 text-sm text-neutral-700">
        Total: {quote.pricing.finalTotal} {quote.pricing.currency}
      </p>
    </section>
  );
}

function GroupSettingsPanel() {
  const quote = useQuoteConversationStore(selectCurrentQuote) as
    | import("@/lib/quote-engine/types").Quote
    | null;
  if (!quote?.group) return null;

  const { distribution, isCorporate, totalPax } = quote.group;

  return (
    <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Grupo / MICE</h3>
      <div className="mt-2 text-sm text-neutral-700">
        <p>
          Distribución habitaciones: {distribution.totalRooms} total (
          {distribution.doubles} dobles, {distribution.singles} individuales,{" "}
          {distribution.triples} triples)
        </p>
        <p className="mt-1">
          Viajeros de grupo: {totalPax ?? quote.summary.passengers.total} (
          {isCorporate ? "corporativo/MICE" : "no corporativo"})
        </p>
      </div>
    </section>
  );
}

export function QuoteCanvas() {
  const status = useQuoteConversationStore(selectStatus);
  const state = useQuoteConversationStore((s) => s.state);

  if (status === "idle") return <EmptyState />;
  if (status === "parsing") return <ParsingPreview state={state as Extract<typeof state, { status: "parsing" }>} />;

  const parsed =
    state.status === "building" ||
    state.status === "complete" ||
    state.status === "awaiting_confirmation" ||
    state.status === "planning_refinement"
      ? toParsedTripInputV2(
          "parsed" in state
            ? (state.parsed as ParsedTripInput)
            : ({} as ParsedTripInput),
        )
      : null;

  if (!parsed) return null;

  return (
    <div className="space-y-8 p-6">
      {parsed.legs.map((leg, idx) => (
        <LegBlock key={leg.id} leg={leg} legIndex={idx} totalLegs={parsed.legs.length} />
      ))}

      {(status === "complete" ||
        status === "awaiting_confirmation" ||
        status === "planning_refinement" ||
        status === "refining") && <GroupSettingsPanel />}

      {(status === "complete" ||
        status === "awaiting_confirmation" ||
        status === "planning_refinement") && <QuoteSummary />}
    </div>
  );
}
