"use client";

import { AirportPicker } from "@/components/AirportPicker";
import { AccessibilityProfileEditor } from "@/components/accessibility/AccessibilityProfileEditor";
import { useAccessibilityProfile } from "@/components/accessibility/AccessibilityProfileContext";
import {
  airportChoicesForBuild,
  isAirportSelectionComplete,
  type AirportChoicesState,
} from "@/lib/quote-engine/airport-selection";
import { useQuoteConversation } from "@/hooks/useQuoteConversation";
import { useState, useEffect } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { RefinementConfirmation } from "./RefinementConfirmation";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { QuoteSummary } from "@/components/chat/QuoteSummary";
import type { Quote as EngineQuote } from "@/lib/quote-engine/types";
import {
  selectCurrentQuote,
  useQuoteConversationStore,
} from "@/lib/quote-conversation/store";

export function ConversationPanel({
  prefillText,
}: {
  prefillText?: string;
}) {
  const {
    status,
    messages,
    submitInitialRequest,
    submitRefinement,
    planPending,
    needsInput,
    awaitingAirports,
    confirmAirports,
    parsedTripInput,
  } = useQuoteConversation();
  const { profile, setProfile } = useAccessibilityProfile();

  const [airportChoices, setAirportChoices] = useState<AirportChoicesState>({
    origin: null,
    destination: null,
  });

  useEffect(() => {
    if (!awaitingAirports) {
      setAirportChoices({ origin: null, destination: null });
    }
  }, [awaitingAirports]);

  useEffect(() => {
    const fromParsed = parsedTripInput?.preferences?.accessibilityProfile;
    if (fromParsed && !profile) {
      setProfile(fromParsed);
    }
  }, [parsedTripInput, profile, setProfile]);

  const handleSubmit = (input: string) => {
    if (status === "idle" || status === "error" || status === "needs_input") {
      submitInitialRequest(input);
    } else if (status === "complete" || status === "awaiting_confirmation") {
      submitRefinement(input);
    }
  };

  const isLocked =
    status === "parsing" ||
    status === "building" ||
    status === "refining" ||
    status === "planning_refinement";

  const currentQuote = useQuoteConversationStore(selectCurrentQuote) as
    | EngineQuote
    | null;

  const typingLabel =
    status === "parsing"
      ? "Entendiendo la petición"
      : status === "building"
        ? "Buscando opciones"
        : status === "planning_refinement"
          ? "Pensando el cambio"
          : status === "refining"
            ? "Aplicando el cambio"
            : null;

  const handleScrollToCanvas = () => {
    document
      .getElementById("quote-canvas")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const placeholder = getPlaceholder(status);
  const enriched = awaitingAirports?.parsed.enrichedTrip;
  const airportComplete =
    enriched && isAirportSelectionComplete(enriched, airportChoices);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto py-3">
        <MessageList messages={messages} />

        {typingLabel ? (
          <div className="px-4 py-2">
            <TypingIndicator label={typingLabel} />
          </div>
        ) : null}

        {status === "complete" && currentQuote ? (
          <div className="px-4">
            <QuoteSummary
              quote={currentQuote}
              onScrollToCanvas={handleScrollToCanvas}
            />
          </div>
        ) : null}

        {needsInput ? (
          <div className="mx-4 my-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">
              Necesito más datos
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-800">
              {needsInput.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {awaitingAirports && enriched ? (
          <div className="mx-4 space-y-4 rounded-xl border border-border-1 bg-paper p-4">
            {enriched._resolved.origin?.needsAgentChoice ? (
              <AirportPicker
                label="Origen"
                resolved={enriched._resolved.origin}
                onSelect={(iata) =>
                  setAirportChoices((current) => ({ ...current, origin: iata }))
                }
              />
            ) : null}
            {enriched._resolved.destination?.needsAgentChoice ? (
              <AirportPicker
                label="Destino"
                resolved={enriched._resolved.destination}
                onSelect={(iata) =>
                  setAirportChoices((current) => ({
                    ...current,
                    destination: iata,
                  }))
                }
              />
            ) : null}
            <button
              type="button"
              disabled={!airportComplete}
              onClick={() => {
                if (!enriched) return;
                confirmAirports(airportChoicesForBuild(enriched, airportChoices));
              }}
              className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-50"
            >
              Generar cotización
            </button>
          </div>
        ) : null}

        <RefinementConfirmation />

        <AccessibilityProfileEditor
          profile={profile ?? parsedTripInput?.preferences?.accessibilityProfile}
          onChange={setProfile}
        />
      </div>
      <MessageInput
        onSubmit={handleSubmit}
        disabled={isLocked || planPending || Boolean(awaitingAirports)}
        placeholder={placeholder}
        initialValue={prefillText}
      />
    </div>
  );
}

function getPlaceholder(status: string): string {
  switch (status) {
    case "idle":
      return "Pega la petición del cliente o cuéntame qué viaje monta…";
    case "parsing":
      return "Entendiendo la petición…";
    case "building":
      return "Construyendo cotización…";
    case "planning_refinement":
      return "Pensando el cambio…";
    case "awaiting_confirmation":
      return "Confirma arriba, o escribe para ajustar el plan…";
    case "refining":
      return "Aplicando el cambio…";
    case "complete":
      return "Pide cambios en lenguaje natural…";
    case "error":
      return "Vuelve a intentarlo o escribe otra petición…";
    default:
      return "";
  }
}
