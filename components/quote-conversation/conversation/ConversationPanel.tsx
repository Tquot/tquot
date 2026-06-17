"use client";

import { AirportPicker } from "@/components/AirportPicker";
import {
  airportChoicesForBuild,
  isAirportSelectionComplete,
  type AirportChoicesState,
} from "@/lib/quote-engine/airport-selection";
import type { EnrichedTripRequest } from "@/lib/parser/airport-resolution";
import { useQuoteConversation } from "@/hooks/useQuoteConversation";
import { useState, useEffect } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { RefinementConfirmation } from "./RefinementConfirmation";

export function ConversationPanel() {
  const {
    status,
    messages,
    submitInitialRequest,
    submitRefinement,
    planPending,
    needsInput,
    awaitingAirports,
    confirmAirports,
  } = useQuoteConversation();

  const [airportChoices, setAirportChoices] = useState<AirportChoicesState>({
    origin: null,
    destination: null,
  });

  useEffect(() => {
    if (!awaitingAirports) {
      setAirportChoices({ origin: null, destination: null });
    }
  }, [awaitingAirports]);

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

  const placeholder = getPlaceholder(status);
  const enriched = awaitingAirports?.parsed.enrichedTrip;
  const airportComplete =
    enriched && isAirportSelectionComplete(enriched, airportChoices);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto py-3">
        <MessageList messages={messages} />

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
          <div className="mx-4 space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
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
              className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Generar cotización
            </button>
          </div>
        ) : null}

        <RefinementConfirmation />
      </div>
      <MessageInput
        onSubmit={handleSubmit}
        disabled={isLocked || planPending || Boolean(awaitingAirports)}
        placeholder={placeholder}
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
