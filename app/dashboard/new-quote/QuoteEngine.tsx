"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveQuote } from "@/app/actions/save-quote";
import {
  applyItemMargin,
  buildQuote,
  getItemMarginPercent,
  getMarginPercent,
  itemsForPricing,
  marginCategoryForItemType,
  pricedQuoteItemsFromQuote,
  selectPrimaryInGroup,
  syncQuotePricing,
  toggleExperienceInQuote,
  toggleTransferInQuote,
  type ParsedTripInput,
  type Quote,
  type QuoteItem,
} from "@/lib/quotes/build-quote";
import type { RefineAction, RefineApplyResult, RefineQuotePatch } from "@/lib/quotes/refine/types";
import { isServerRefinementAction } from "@/lib/quotes/refine/utils";
import type { ComparatorResultRow } from "@/lib/comparator";
import { tripRequestToParsedTripInput } from "@/lib/quotes/map-parser";
import type { TripRequest } from "@/lib/parser/schema";
import {
  enrichWithAirports,
  type EnrichedTripRequest,
} from "@/lib/parser/airport-resolution";
import { AirportPicker } from "@/components/AirportPicker";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useDashboardLanguage } from "../dashboard-language-provider";
import type { DashboardTranslation } from "../translations";
import type { Locale } from "../translations";
import { LocaleToggleButtons } from "../locale-toggle-buttons";
import { formatMessage } from "../format-message";
import {
  airportChoicesForBuild,
  isAirportSelectionComplete,
  needsAirportSelection,
  type AirportChoicesState,
} from "@/lib/quote-engine/airport-selection";
import { FlightQuoteItemsSection, QuoteItemsSection } from "./quote-results";
import {
  HotelComparatorPanel,
  type ComparatorPanelState,
  fetchHotelComparatorPanel,
} from "./quote-comparator";
import {
  generateAgentPDF,
  generateClientPDF,
  openServerPdf,
} from "./quote-pdf";
import {
  allQuoteItems,
  cloneQuote,
  DataSourceBadge,
  formatCurrency,
  TotalCard,
} from "./quote-shared";

type StepStatus = "pending" | "active" | "done";

type ProcessStep = {
  title: string;
  chips: string[];
};

type ChatMessage = {
  role: "agent" | "ai";
  content: string;
};

function buildProcessSteps(t: DashboardTranslation): ProcessStep[] {
  return [
    {
      title: t.stepParseTitle,
      chips: [t.stepParseChip1, t.stepParseChip2, t.stepParseChip3],
    },
    {
      title: t.stepMapTitle,
      chips: [t.stepMapChip1, t.stepMapChip2],
    },
    {
      title: t.stepBuildTitle,
      chips: [t.stepBuildChip1, t.stepBuildChip2, t.stepBuildChip3],
    },
  ];
}

function travelersChipLabel(
  t: DashboardTranslation,
  adults: number,
  children?: number,
) {
  const adultCount = adults ?? 2;
  if (children && children > 0) {
    return formatMessage(t.chipTravelersWithChildren, {
      adults: adultCount,
      children,
    });
  }
  return formatMessage(t.chipTravelers, { adults: adultCount });
}

function getStepStatus(
  index: number,
  activeStep: number,
  isRunning: boolean,
  stepCount: number,
) {
  if (!isRunning && activeStep < 0) return "pending";
  if (index < activeStep) return "done";
  if (index === activeStep && isRunning) return "active";
  if (activeStep >= stepCount) return "done";
  return "pending";
}

function pipelineDelay(ms = 600) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const PARSER_TIMEOUT_MS = 10_000;

type ParserApiResult =
  | { ok: true; status: "ready"; data: TripRequest }
  | { ok: true; status: "needs_input"; questions: string[] }
  | { ok: false; reason: "timeout" | "error" | "invalid" };

async function callParserApi(
  text: string,
  agentId: string,
): Promise<ParserApiResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PARSER_TIMEOUT_MS);

  try {
    const response = await fetch("/api/parser/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        agentId,
        currentDate: new Date().toISOString().slice(0, 10),
      }),
      signal: controller.signal,
    });
    const data = await response.json();

    if (data.status === "needs_input") {
      return {
        ok: true,
        status: "needs_input",
        questions: data.questions ?? [],
      };
    }

    if (response.ok && data.status === "ready" && data.data) {
      return { ok: true, status: "ready", data: data.data as TripRequest };
    }

    return { ok: false, reason: "invalid" };
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "AbortError";
    if (timedOut) {
      console.warn(
        `[QuoteEngine] Parser API timed out after ${PARSER_TIMEOUT_MS / 1000}s`,
      );
      return { ok: false, reason: "timeout" };
    }
    console.error("[QuoteEngine] Parser failed", error);
    return { ok: false, reason: "error" };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function reapplyQuoteMargins(quote: Quote, tripInput: ParsedTripInput | null) {
  const pricedItems = pricedQuoteItemsFromQuote(quote);
  const baseTotal = pricedItems.reduce((sum, item) => sum + item.price, 0);

  for (const item of allQuoteItems(quote)) {
    const category = marginCategoryForItemType(item.type);
    applyItemMargin(
      item,
      tripInput?.agencyMargins && category
        ? getMarginPercent(baseTotal, tripInput.agencyMargins, category)
        : getMarginPercent(baseTotal),
    );
  }

  syncQuotePricing(quote);
}

function isDirectFlight(item: QuoteItem): boolean {
  if (item.flightDetails) {
    return item.flightDetails.stops === 0;
  }
  return /\bdirecto\b|0 escala|\bDirect\b/i.test(item.title);
}

function filterDirectFlights(quote: Quote): { next: Quote; message: string } {
  const cloned = cloneQuote(quote);
  const outbound = cloned.flights.filter((item) => item.id.startsWith("flight-out-"));
  const returnLeg = cloned.flights.filter((item) =>
    item.id.startsWith("flight-return-"),
  );
  const other = cloned.flights.filter(
    (item) =>
      !item.id.startsWith("flight-out-") && !item.id.startsWith("flight-return-"),
  );

  const directOutbound = outbound.filter(isDirectFlight);
  const directReturn = returnLeg.filter(isDirectFlight);

  if (directOutbound.length === 0 && directReturn.length === 0) {
    return {
      next: cloned,
      message: "No hay vuelos directos en la cotización actual.",
    };
  }

  const nextOutbound = (directOutbound.length > 0 ? directOutbound : outbound).map(
    (item, index) => ({ ...item, alternative: index > 0 }),
  );
  const nextReturn = (directReturn.length > 0 ? directReturn : returnLeg).map(
    (item, index) => ({ ...item, alternative: index > 0 }),
  );

  cloned.flights = [...nextOutbound, ...nextReturn, ...other];

  const warnings: string[] = [];
  if (directOutbound.length === 0) {
    warnings.push("ida");
  }
  if (directReturn.length === 0) {
    warnings.push("vuelta");
  }

  const message =
    warnings.length > 0
      ? `He filtrado vuelos directos donde era posible. Sin opciones directas en: ${warnings.join(" y ")}.`
      : "He dejado solo vuelos directos en la cotización.";

  return { next: cloned, message };
}

function mergeRefinePatch(quote: Quote, patch: RefineQuotePatch): Quote {
  const next = cloneQuote(quote);
  if (patch.hotels) {
    next.hotels = patch.hotels.map((item) => ({ ...item }));
  }
  if (patch.experiences) {
    next.experiences = patch.experiences.map((item) => ({ ...item }));
  }
  if (patch.transfers) {
    next.transfers = patch.transfers.map((item) => ({ ...item }));
  }
  if (patch.flights) {
    next.flights = patch.flights.map((item) => ({ ...item }));
  }
  if (patch._meta) {
    next._meta = { ...next._meta, ...patch._meta };
  }
  return next;
}

export function QuoteEngine() {
  const { locale, t } = useDashboardLanguage();
  const processSteps = useMemo(() => buildProcessSteps(t), [t]);
  const defaultStepChips = useMemo(
    () => processSteps.map((step) => step.chips),
    [processSteps],
  );
  const requestInputRef = useRef<HTMLTextAreaElement>(null);
  const resultsSectionRef = useRef<HTMLElement>(null);
  const [request, setRequest] = useState(t.defaultQuoteRequest);
  const [activeStep, setActiveStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [tripInput, setTripInput] = useState<ParsedTripInput | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [stepChips, setStepChips] = useState(defaultStepChips);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "ai", content: t.chatWelcome },
  ]);
  const [agentNotes, setAgentNotes] = useState(t.defaultAgentNotes);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [enrichedTrip, setEnrichedTrip] = useState<EnrichedTripRequest | null>(
    null,
  );
  const [airportChoices, setAirportChoices] = useState<AirportChoicesState>({
    origin: null,
    destination: null,
  });
  const [parserQuestions, setParserQuestions] = useState<string[] | null>(null);
  const [comparatorPanel, setComparatorPanel] = useState<ComparatorPanelState | null>(
    null,
  );

  const flightsIncluded =
    tripInput?.includeFlights ??
    (enrichedTrip
      ? (tripRequestToParsedTripInput(enrichedTrip)?.includeFlights ?? true)
      : true);

  const awaitingAirportChoice =
    enrichedTrip !== null &&
    flightsIncluded &&
    needsAirportSelection(enrichedTrip);
  const airportChoiceComplete =
    enrichedTrip === null ||
    isAirportSelectionComplete(enrichedTrip, airportChoices);

  useEffect(() => {
    if (!isRunning && !parserQuestions) {
      setStepChips(defaultStepChips);
    }
  }, [defaultStepChips, isRunning, parserQuestions]);

  useEffect(() => {
    if (isComplete && quote && resultsSectionRef.current) {
      resultsSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isComplete, quote?.id]);

  useEffect(() => {
    setRequest(t.defaultQuoteRequest);
    setAgentNotes(t.defaultAgentNotes);
    setChatMessages((messages) => {
      if (messages.length === 1 && messages[0]?.role === "ai") {
        return [{ role: "ai", content: t.chatWelcome }];
      }
      return messages;
    });
  }, [
    t.defaultQuoteRequest,
    t.defaultAgentNotes,
    t.chatWelcome,
  ]);

  function handleSelectQuoteItem(itemId: string) {
    setQuote((current) => {
      if (!current) {
        return current;
      }

      const next = cloneQuote(current);
      selectPrimaryInGroup(next, itemId);
      syncQuotePricing(next);
      return next;
    });
  }

  function handleToggleExperienceItem(itemId: string) {
    setQuote((current) => {
      if (!current) {
        return current;
      }

      const next = cloneQuote(current);
      toggleExperienceInQuote(next, itemId);
      syncQuotePricing(next);
      return next;
    });
  }

  function handleToggleTransferItem(itemId: string) {
    setQuote((current) => {
      if (!current) {
        return current;
      }

      const next = cloneQuote(current);
      toggleTransferInQuote(next, itemId);
      syncQuotePricing(next);
      return next;
    });
  }

  function handleQuoteItemMarginChange(itemId: string, marginPercent: number) {
    setQuote((current) => {
      if (!current) {
        return current;
      }

      const next = cloneQuote(current);
      const item = allQuoteItems(next).find((entry) => entry.id === itemId);
      if (!item) {
        return current;
      }

      applyItemMargin(item, marginPercent);
      syncQuotePricing(next);
      return next;
    });
  }

  function handleFlightFareSelect(itemId: string, offerId: string) {
    setQuote((current) => {
      if (!current) {
        return current;
      }

      const next = cloneQuote(current);
      const item = next.flights.find((entry) => entry.id === itemId);
      const details = item?.flightDetails;
      if (!item || !details) {
        return current;
      }

      if (details.primaryOfferId && offerId === details.primaryOfferId) {
        details.selectedOfferId = details.primaryOfferId;
        details.priceNumeric = details.primaryPriceNumeric ?? details.priceNumeric;
        details.cabinClass = details.primaryCabinClass ?? details.cabinClass;
        details.baggageIncluded =
          details.primaryBaggageIncluded ?? details.baggageIncluded;
        if (details.primaryFareName) {
          details.fareName = details.primaryFareName;
        }
      } else {
        const fare = details.fareOptions?.find((entry) => entry.offerId === offerId);
        if (!fare) {
          return current;
        }
        details.selectedOfferId = fare.offerId;
        details.priceNumeric = fare.priceNumeric;
        details.cabinClass = fare.cabinClass;
        details.baggageIncluded = fare.baggageIncluded;
        details.fareName = fare.fareName;
      }

      const basePrice =
        details.priceNumeric > 0
          ? details.priceNumeric
          : item.price;
      item.price = basePrice;
      applyItemMargin(item, getItemMarginPercent(item));
      syncQuotePricing(next);
      return next;
    });
  }

  async function handleCompareHotel(itemId: string) {
    if (!quote || !tripInput) return;

    setComparatorPanel({
      itemId,
      loading: true,
      error: null,
      results: null,
      catalogProviders: [],
    });

    const panel = await fetchHotelComparatorPanel({
      quote,
      tripInput,
      itemId,
      t,
    });
    setComparatorPanel(panel);
  }

  function handleSelectComparatorPrice(row: ComparatorResultRow) {
    if (!comparatorPanel || row.status !== "ok" || !row.bestRoom) {
      return;
    }

    setQuote((current) => {
      if (!current) {
        return current;
      }

      const next = cloneQuote(current);
      const item = next.hotels.find((entry) => entry.id === comparatorPanel.itemId);
      if (!item) {
        return current;
      }

      item.price = row.bestRoom!.netPrice;
      item.provider = row.providerName;
      item.hotelDetails = {
        ...item.hotelDetails,
        providerId: row.providerId,
      };
      applyItemMargin(item, getItemMarginPercent(item));
      syncQuotePricing(next);
      return next;
    });
    setComparatorPanel(null);
  }

  function sendChatMessage() {
    void sendChatMessageAsync();
  }

  async function sendChatMessageAsync() {
    const message = chatInput.trim();
    if (!message || !quote || !tripInput || isRefining) return;

    setIsRefining(true);
    setChatInput("");
    setChatMessages((messages) => [...messages, { role: "agent", content: message }]);

    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const agentId = user?.id ?? "test-agent";

    try {
      const classifyResponse = await fetch("/api/quote/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentQuote: quote,
          message,
          tripInput,
          agentId,
        }),
      });

      const classifyData = await classifyResponse.json();
      if (!classifyResponse.ok) {
        throw new Error(classifyData.error ?? "Refinement request failed");
      }

      const action = classifyData.action as RefineAction;
      let response = t.chatDefault;

      if (action.action === "explain") {
        response = action.params.text;
      } else if (action.action === "unknown") {
        response = action.params.text;
      } else if (action.action === "cheaper") {
        setQuote((current) => {
          if (!current) return current;
          const next = cloneQuote(current);
          for (const item of pricedQuoteItemsFromQuote(next)) {
            applyItemMargin(item, getItemMarginPercent(item) * 0.85);
          }
          syncQuotePricing(next);
          return next;
        });
        response = t.chatCheaper;
      } else if (action.action === "filter_direct_flights") {
        let filterMessage = "He actualizado los vuelos.";
        setQuote((current) => {
          if (!current) return current;
          const filtered = filterDirectFlights(current);
          syncQuotePricing(filtered.next);
          filterMessage = filtered.message;
          return filtered.next;
        });
        response = filterMessage;
      } else if (isServerRefinementAction(action)) {
        const applyResponse = await fetch("/api/quote/refine/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            currentQuote: quote,
            tripInput,
            agentId,
          }),
        });

        const applyData = (await applyResponse.json()) as RefineApplyResult & {
          error?: string;
        };

        if (!applyResponse.ok) {
          throw new Error(applyData.error ?? "Apply refinement failed");
        }

        if (applyData.updatedTripInput) {
          setTripInput(applyData.updatedTripInput);
        }

        if (applyData.patch) {
          setQuote((current) => {
            if (!current) return current;
            const next = mergeRefinePatch(current, applyData.patch!);
            reapplyQuoteMargins(next, applyData.updatedTripInput ?? tripInput);
            return next;
          });
        }

        response = applyData.suggestion
          ? `${applyData.message}\n\n${applyData.suggestion}`
          : applyData.message;
      }

      setChatMessages((messages) => [...messages, { role: "ai", content: response }]);
    } catch (error) {
      const fallback =
        error instanceof Error ? error.message : "No he podido procesar la solicitud.";
      setChatMessages((messages) => [
        ...messages,
        { role: "ai", content: fallback },
      ]);
    } finally {
      setIsRefining(false);
    }
  }

  function resetQuoteSession() {
    setQuote(null);
    setTripInput(null);
    setSavedQuoteId(null);
    setIsComplete(false);
    setIsRunning(false);
    setActiveStep(-1);
    setParserQuestions(null);
    setChatMessages([{ role: "ai", content: t.chatWelcome }]);
    setStepChips(defaultStepChips);
    setEnrichedTrip(null);
    setAirportChoices({ origin: null, destination: null });
    setIsRefining(false);
    setChatInput("");
  }

  async function continueQuoteFromEnriched(enrichedTrip: EnrichedTripRequest) {
    const choicesForBuild = airportChoicesForBuild(enrichedTrip, airportChoices);
    const parsedInput = tripRequestToParsedTripInput(enrichedTrip);
    if (!parsedInput) return;
    setEnrichedTrip(null);
    setAirportChoices({ origin: null, destination: null });

    await pipelineDelay();

    setActiveStep(1);
    setStepChips((current) =>
      current.map((chips, index) =>
        index === 1
          ? [
              formatMessage(t.chipRoute, {
                origin: parsedInput.origin,
                destination: parsedInput.destination,
              }),
              formatMessage(t.chipDates, {
                start: parsedInput.dates.start,
                end: parsedInput.dates.end,
              }),
              t.chipDatesConfirmed,
            ]
          : chips,
      ),
    );
    await pipelineDelay();

    setActiveStep(2);
    setSavedQuoteId(null);
    const built = await buildQuote({
      ...parsedInput,
      enrichedTrip,
      airportChoices: choicesForBuild,
      locale,
    });
    setTripInput({
      ...parsedInput,
      enrichedTrip,
      airportChoices: choicesForBuild,
    });
    setQuote(built);

    setStepChips((current) =>
      current.map((chips, index) =>
        index === 2
          ? [
              formatMessage(t.chipFlightsFound, {
                count: built.flights.length,
              }),
              formatMessage(t.chipHotelsFound, { count: built.hotels.length }),
              formatMessage(t.chipTotalPrice, {
                value: formatCurrency(built.pricing.finalTotal, locale),
              }),
            ]
          : chips,
      ),
    );
    await pipelineDelay();

    setActiveStep(processSteps.length);
    setIsRunning(false);
    setIsComplete(true);
  }

  async function runQuoteEngine() {
    const latestRequest = requestInputRef.current?.value ?? request;
    setRequest(latestRequest);

    if (awaitingAirportChoice && enrichedTrip) {
      if (!airportChoiceComplete) return;
      setIsRunning(true);
      setIsComplete(false);
      setQuote(null);
      setTripInput(null);
      setSavedQuoteId(null);
      await continueQuoteFromEnriched(enrichedTrip);
      return;
    }

    setIsRunning(true);
    setIsComplete(false);
    setQuote(null);
    setTripInput(null);
    setSavedQuoteId(null);
    setParserQuestions(null);
    setEnrichedTrip(null);
    setAirportChoices({ origin: null, destination: null });
    setStepChips(defaultStepChips);
    setActiveStep(0);

    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const agentId = user?.id ?? "test-agent";

    const parserResult = await callParserApi(latestRequest, agentId);

    if (parserResult.ok && parserResult.status === "needs_input") {
      const questions = parserResult.questions;
      setParserQuestions(questions);
      setActiveStep(0);
      setStepChips((current) =>
        current.map((chips, index) =>
          index === 0
            ? [t.chipParserNeedsDetails, ...questions.slice(0, 2)]
            : chips,
        ),
      );
      setIsRunning(false);
      return;
    }

    if (parserResult.ok && parserResult.status === "ready") {
      const enriched = enrichWithAirports(parserResult.data);
      console.log("[QuoteEngine] enriched trip", {
        origin: parserResult.data.origin,
        destination: parserResult.data.destination,
        needsOriginChoice: enriched._resolved.origin?.needsAgentChoice,
        needsDestinationChoice: enriched._resolved.destination?.needsAgentChoice,
        resolvedOrigin: enriched._resolved.origin,
        resolvedDestination: enriched._resolved.destination,
      });
      setStepChips((current) =>
        current.map((chips, index) =>
          index === 0
            ? [
                formatMessage(t.chipDestination, {
                  value: parserResult.data.destination,
                }),
                travelersChipLabel(
                  t,
                  parserResult.data.adults ?? 2,
                  parserResult.data.children,
                ),
                parserResult.data.departureDate
                  ? formatMessage(t.chipDates, {
                      start: parserResult.data.departureDate,
                      end:
                        parserResult.data.returnDate ??
                        parserResult.data.departureDate,
                    })
                  : t.chipDatesPending,
              ]
            : chips,
        ),
      );

      const includeFlightsForTrip =
        tripRequestToParsedTripInput(enriched)?.includeFlights ?? true;

      if (includeFlightsForTrip && needsAirportSelection(enriched)) {
        setEnrichedTrip(enriched);
        setAirportChoices({ origin: null, destination: null });
        setActiveStep(0);
        setIsRunning(false);
        return;
      }

      await continueQuoteFromEnriched(enriched);
      return;
    }

    setParserQuestions(null);
    const rephraseChip =
      parserResult.ok === false && parserResult.reason === "timeout"
        ? t.chipParserTimeoutRephrase
        : t.chipParserRephrase;
    setStepChips((current) =>
      current.map((chips, index) =>
        index === 0 ? [rephraseChip] : chips,
      ),
    );
    setIsRunning(false);
  }

  async function persistCurrentQuote(): Promise<string | null> {
    if (!quote || !tripInput) {
      console.error("[QuoteEngine] persistCurrentQuote: missing quote or tripInput");
      return null;
    }

    setIsSavingQuote(true);
    try {
      const result = await saveQuote({
        quote,
        tripInput,
        agentNotes: agentNotes || undefined,
      });
      if (result.ok) {
        setSavedQuoteId(result.quoteId);
        return result.quoteId;
      }
      console.error("[QuoteEngine] saveQuote failed:", result.error);
      return null;
    } finally {
      setIsSavingQuote(false);
    }
  }

  async function saveAndOpenPdf(variant: "agent" | "client") {
    const quoteId = await persistCurrentQuote();
    if (!quoteId) return;
    openServerPdf(quoteId, variant);
  }

  async function handleSaveAndGenerateClientPdf() {
    await saveAndOpenPdf("client");
  }

  async function handleAgentPdf() {
    const quoteId = await persistCurrentQuote();
    if (quoteId) {
      openServerPdf(quoteId, "agent");
      return;
    }
    if (quote) {
      generateAgentPDF({ quote, locale, t, agentNotes });
    }
  }

  async function handleClientPdf() {
    const quoteId = await persistCurrentQuote();
    if (quoteId) {
      openServerPdf(quoteId, "client");
      return;
    }
    if (quote) {
      generateClientPDF({ quote, locale, t });
    }
  }

  return (
    <div className="min-h-screen bg-tquot-bg px-4 py-8 text-tquot-text sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center rounded-lg border border-tquot-border bg-tquot-surface px-4 py-2 text-sm text-tquot-muted shadow-sm transition-colors hover:bg-tquot-bg hover:text-tquot-accent"
        >
          ← {t.backToDashboard}
        </Link>

        <section className="mb-8 rounded-xl border border-tquot-border bg-tquot-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-5xl font-black tracking-tight text-tquot-teal sm:text-6xl lg:text-7xl">
                TQuot
              </span>
              <span className="pb-1 text-sm font-semibold uppercase tracking-[0.35em] text-tquot-muted">
                AI Engine
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-tquot-text sm:text-5xl lg:text-6xl">
              {t.newQuote}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-tquot-muted sm:text-lg">
              {t.quoteEngineSubtitle}
            </p>
          </div>
          <LocaleToggleButtons />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-xl border border-tquot-border border-l-4 border-l-tquot-teal bg-white p-6 shadow-md">
            <label
              htmlFor="client-request"
              className="mb-3 block text-sm font-medium text-tquot-text"
            >
              {t.clientRequestLabel}
            </label>
            <textarea
              id="client-request"
              ref={requestInputRef}
              value={request}
              onChange={(event) => {
                setRequest(event.target.value);
                setEnrichedTrip(null);
                setAirportChoices({ origin: null, destination: null });
                setParserQuestions(null);
              }}
              rows={10}
              className="w-full resize-y rounded-xl border border-tquot-border bg-slate-50/50 px-5 py-5 text-tquot-text placeholder:text-tquot-muted/60 outline-none transition-colors duration-200 focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20"
              placeholder={t.quoteEngineRequestPlaceholder}
            />

            {awaitingAirportChoice && enrichedTrip ? (
              <div className="mt-6 space-y-4">
                {enrichedTrip._resolved.origin?.needsAgentChoice ? (
                  <AirportPicker
                    label={t.origin}
                    resolved={enrichedTrip._resolved.origin}
                    onSelect={(iata) =>
                      setAirportChoices((current) => ({
                        ...current,
                        origin: iata,
                      }))
                    }
                  />
                ) : null}
                {enrichedTrip._resolved.destination?.needsAgentChoice ? (
                  <AirportPicker
                    label={t.destination}
                    resolved={enrichedTrip._resolved.destination}
                    onSelect={(iata) =>
                      setAirportChoices((current) => ({
                        ...current,
                        destination: iata,
                      }))
                    }
                  />
                ) : null}
              </div>
            ) : null}

            {parserQuestions && parserQuestions.length > 0 ? (
              <div
                className="mt-6 rounded-xl border border-tquot-warm/30 bg-amber-50 p-4"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm font-semibold text-amber-900">
                  {t.chipParserNeedsDetails}
                </p>
                <p className="mt-1 text-xs text-amber-800/80">
                  {t.parserQuestionsHint}
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-tquot-text">
                  {parserQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button
              type="button"
              onClick={runQuoteEngine}
              disabled={
                !request.trim() ||
                isRunning ||
                (awaitingAirportChoice && !airportChoiceComplete)
              }
              className="mt-6 w-full rounded-xl bg-tquot-teal px-8 py-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#00b396] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? t.processing : t.generateQuote}
            </button>
          </div>

          <div className="rounded-xl border border-tquot-border bg-white p-6 shadow-md">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-tquot-teal">
                  {t.livePipeline}
                </p>
                <h2 className="mt-2 text-xl font-bold text-tquot-text">
                  {t.processStepByStep}
                </h2>
              </div>
              <span className="rounded-full border border-tquot-teal/30 bg-tquot-teal/10 px-3 py-1 text-xs font-semibold text-tquot-teal">
                {isRunning
                  ? t.statusRunning
                  : isComplete
                    ? t.statusComplete
                    : t.statusReady}
              </span>
            </div>
            <div className="space-y-3">
              {processSteps.map((step, index) => {
                const status = getStepStatus(
                  index,
                  activeStep,
                  isRunning,
                  processSteps.length,
                );
                return (
                  <ProcessStepCard
                    key={step.title}
                    index={index}
                    status={status}
                    title={step.title}
                    chips={stepChips[index]}
                    labels={{
                      processing: t.stepProcessing,
                      done: t.stepDone,
                      pending: t.stepPending,
                      searching: t.stepSearchingSource,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {isComplete && quote ? (
          <section
            ref={resultsSectionRef}
            className="mt-8 scroll-mt-8 rounded-xl border border-tquot-border bg-tquot-surface p-6 shadow-md"
          >
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-tquot-teal">
                  {t.proposalWorkspace}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-tquot-teal/30 bg-tquot-teal/10 px-3 py-1 font-mono text-sm font-bold tracking-wide text-tquot-teal">
                    {quote.id}
                  </span>
                </div>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-tquot-text sm:text-4xl">
                  {t.compiledQuote}
                </h2>
                <p className="mt-2 text-2xl font-bold leading-tight text-tquot-text sm:text-3xl">
                  {quote.summary.route}
                </p>
                <p className="mt-2 text-sm text-tquot-muted">
                  {formatMessage(
                    locale === "es"
                      ? "{days} días · {travelers} viajeros"
                      : "{days} days · {travelers} travelers",
                    {
                      days: quote.summary.durationDays,
                      travelers: quote.summary.passengers.total,
                    },
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetQuoteSession}
                  className="rounded-xl border border-tquot-border bg-tquot-surface px-5 py-3 text-sm font-semibold text-tquot-text shadow-sm transition-colors hover:bg-tquot-bg"
                >
                  {t.newQuote}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveAndGenerateClientPdf()}
                  disabled={isSavingQuote}
                  className="rounded-xl border border-tquot-teal/30 bg-tquot-teal/10 px-5 py-3 text-sm font-semibold text-tquot-teal transition-colors hover:bg-tquot-teal/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingQuote ? t.savingQuote : t.saveAndGeneratePdf}
                </button>
                <button
                  type="button"
                  onClick={() => void handleAgentPdf()}
                  disabled={isSavingQuote}
                  className="rounded-xl border border-tquot-teal/30 bg-tquot-teal/10 px-5 py-3 text-sm font-semibold text-tquot-teal transition-colors hover:bg-tquot-teal/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingQuote ? t.savingQuote : t.pdfAgent}
                </button>
                <button
                  type="button"
                  onClick={() => void handleClientPdf()}
                  disabled={isSavingQuote}
                  className="rounded-xl bg-tquot-teal px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#00b396] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingQuote ? t.savingQuote : t.pdfClient}
                </button>
              </div>
            </div>

            <div className="mb-6 flex flex-col gap-6">
              {quote.flights.length > 0 ? (
                <div>
                  <DataSourceBadge source={quote._meta.flightsSource} />
                  <FlightQuoteItemsSection
                    eyebrow={t.sectionFlightsEyebrow}
                    title={t.sectionFlightsTitle}
                    items={quote.flights}
                    passengerCount={quote.summary.passengers.adults}
                    onSelectItem={handleSelectQuoteItem}
                    onMarginChange={handleQuoteItemMarginChange}
                    onFlightFareSelect={handleFlightFareSelect}
                  />
                </div>
              ) : null}
              {quote.transfers.length > 0 ? (
                <div>
                  <DataSourceBadge source={quote._meta.transfersSource} />
                  <QuoteItemsSection
                    eyebrow={t.sectionTransfersEyebrow}
                    title={t.sectionTransfersTitle}
                    items={quote.transfers}
                    selectionMode="independent"
                    onToggleItem={handleToggleTransferItem}
                    onMarginChange={handleQuoteItemMarginChange}
                  />
                </div>
              ) : null}
              {quote.hotels.length > 0 ? (
                <div>
                  <DataSourceBadge source={quote._meta.hotelsSource} />
                  <QuoteItemsSection
                    eyebrow={t.sectionHotelsEyebrow}
                    title={t.sectionHotelsTitle}
                    items={quote.hotels}
                    onSelectItem={handleSelectQuoteItem}
                    onMarginChange={handleQuoteItemMarginChange}
                    onCompareItem={handleCompareHotel}
                  />
                </div>
              ) : null}
              {quote.experiences.length > 0 ? (
                <QuoteItemsSection
                  eyebrow={t.sectionExperiencesEyebrow}
                  title={t.sectionExperiencesTitle}
                  items={quote.experiences}
                  selectionMode="independent"
                  onToggleItem={handleToggleExperienceItem}
                  onMarginChange={handleQuoteItemMarginChange}
                />
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-tquot-border bg-tquot-surface p-5 shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-tquot-text">
                  {t.aiRefinementChat}
                </h3>
                <div className="mb-4 max-h-56 space-y-3 overflow-y-auto pr-1">
                  {chatMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`rounded-xl px-4 py-3 text-sm ${
                        message.role === "ai"
                          ? "border border-tquot-border bg-tquot-bg text-tquot-text"
                          : "border border-tquot-accent/20 bg-blue-50 text-tquot-text"
                      }`}
                    >
                      <span className="font-semibold">
                        {message.role === "ai" ? t.chatRoleAi : t.chatRoleAgent}:
                      </span>{" "}
                      {message.content}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") sendChatMessage();
                    }}
                    disabled={isRefining}
                    placeholder={t.chatPlaceholder}
                    className="min-w-0 flex-1 rounded-xl border border-tquot-border bg-tquot-surface px-4 py-3 text-sm text-tquot-text outline-none focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={sendChatMessage}
                    disabled={isRefining || !chatInput.trim()}
                    className="rounded-xl bg-tquot-teal px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRefining ? "..." : t.send}
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-tquot-border bg-tquot-surface p-5 shadow-sm">
                <label className="mb-3 block text-lg font-semibold text-tquot-text">
                  {t.agentNotes}
                </label>
                <textarea
                  value={agentNotes}
                  onChange={(event) => setAgentNotes(event.target.value)}
                  rows={8}
                  className="w-full resize-y rounded-xl border border-tquot-border bg-tquot-surface px-4 py-3 text-sm text-tquot-text outline-none focus:border-tquot-accent focus:ring-2 focus:ring-tquot-accent/20"
                />
              </section>
            </div>

            <div className="mt-6 grid gap-4 rounded-xl border border-tquot-border bg-gradient-to-r from-tquot-teal/5 to-slate-50 p-5 shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-tquot-border">
              <TotalCard
                label={t.baseTotal}
                value={quote.pricing.baseTotal}
                locale={locale}
              />
              <TotalCard
                label={t.margin}
                value={quote.pricing.margin}
                locale={locale}
              />
              <TotalCard
                label={formatMessage(t.finalTotal, {
                  currency: quote.pricing.currency,
                })}
                value={quote.pricing.finalTotal}
                highlight
                locale={locale}
              />
            </div>
          </section>
        ) : null}
      </main>

      {comparatorPanel && quote ? (
        <HotelComparatorPanel
          item={quote.hotels.find((entry) => entry.id === comparatorPanel.itemId) ?? null}
          panel={comparatorPanel}
          locale={locale}
          onClose={() => setComparatorPanel(null)}
          onSelectPrice={handleSelectComparatorPrice}
        />
      ) : null}
    </div>
  );
}

function ProcessStepCard({
  index,
  status,
  title,
  chips,
  labels,
}: {
  index: number;
  status: StepStatus;
  title: string;
  chips: string[];
  labels: {
    processing: string;
    done: string;
    pending: string;
    searching: string;
  };
}) {
  const statusLabel =
    status === "active"
      ? labels.processing
      : status === "done"
        ? labels.done
        : labels.pending;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
        status === "active"
          ? "border-tquot-teal border-l-4 border-l-tquot-teal bg-tquot-teal/10 shadow-sm ring-1 ring-tquot-teal/20"
          : status === "done"
            ? "border-tquot-success/30 bg-emerald-50"
            : "border-tquot-border bg-tquot-bg"
      }`}
    >
      <div className="flex items-center gap-3">
        <StepIndicator status={status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-tquot-text">{title}</p>
            <span className="hidden rounded-full border border-tquot-border bg-tquot-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tquot-muted sm:inline-flex">
              {String(index + 1).padStart(2, "0")} · {statusLabel}
            </span>
          </div>
          {status === "active" ? (
            <div className="mt-3 flex items-center gap-1.5">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-tquot-teal"
                  style={{ animationDelay: `${dot * 140}ms` }}
                />
              ))}
              <span className="ml-2 text-xs text-tquot-muted">
                {labels.searching}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      {status !== "pending" ? (
        <div className="mt-3 flex max-w-full flex-wrap gap-1.5 pl-0 sm:gap-2 sm:pl-9">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-tquot-teal/20 bg-tquot-teal/10 px-2.5 py-1 text-xs font-medium text-tquot-teal"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StepIndicator({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tquot-success text-xs font-bold text-white shadow-sm">
        ✓
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-tquot-teal bg-tquot-teal/10">
        <span className="absolute h-7 w-7 animate-ping rounded-full border border-tquot-teal/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-tquot-teal" />
      </span>
    );
  }

  return <span className="h-7 w-7 rounded-full border border-tquot-border bg-tquot-surface" />;
}
