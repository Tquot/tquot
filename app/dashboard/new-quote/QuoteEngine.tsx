"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyItemMargin,
  buildQuote,
  type AirportFlightChoices,
  getItemMarginPercent,
  itemsForPricing,
  pricedQuoteItemsFromQuote,
  selectPrimaryInGroup,
  syncQuotePricing,
  type Quote,
  type QuoteDataSource,
  type QuoteItem,
  type QuoteItemSource,
} from "@/lib/quotes/build-quote";
import { tripRequestToParsedTripInput } from "@/lib/quotes/map-parser";
import type { TripRequest } from "@/lib/parser/schema";
import {
  enrichWithAirports,
  type EnrichedTripRequest,
} from "@/lib/parser/airport-resolution";
import { AirportPicker } from "@/components/AirportPicker";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { readAgencyProfile } from "../agency/agency-profile";
import { useDashboardLanguage } from "../dashboard-language-provider";
import type { DashboardTranslation } from "../translations";
import type { Locale } from "../translations";
import { LocaleToggleButtons } from "../locale-toggle-buttons";
import { formatMessage } from "../format-message";
import { QuoteItemsSection } from "./quote-results";

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
      chips: [t.stepParseChip1, t.stepParseChip2],
    },
    {
      title: t.stepMapTitle,
      chips: [t.stepMapChip1, t.stepMapChip2],
    },
    {
      title: t.stepBuildTitle,
      chips: [
        t.stepBuildChip1,
        t.stepBuildChip2,
        t.stepBuildChip3,
        t.stepBuildChip4,
      ],
    },
  ];
}

const sourcePdfColors: Record<QuoteItemSource, [number, number, number]> = {
  mock: [148, 163, 184],
  inventory: [0, 201, 167],
  api: [168, 85, 247],
};

function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
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

function allQuoteItems(quote: Quote): QuoteItem[] {
  return [...quote.flights, ...quote.hotels, ...quote.experiences];
}

function cloneQuote(quote: Quote): Quote {
  return {
    ...quote,
    flights: quote.flights.map((item) => ({ ...item })),
    hotels: quote.hotels.map((item) => ({ ...item })),
    experiences: quote.experiences.map((item) => ({ ...item })),
    summary: { ...quote.summary, passengers: { ...quote.summary.passengers } },
    pricing: { ...quote.pricing },
    _meta: { ...quote._meta },
  };
}

function pipelineDelay(ms = 600) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const PARSER_TIMEOUT_MS = 10_000;

type AirportChoice = string | "all";

type AirportChoicesState = {
  origin: AirportChoice | null;
  destination: AirportChoice | null;
};

function needsAirportSelection(enriched: EnrichedTripRequest): boolean {
  return (
    enriched._resolved.origin?.needsAgentChoice === true ||
    enriched._resolved.destination?.needsAgentChoice === true
  );
}

function isAirportSelectionComplete(
  enriched: EnrichedTripRequest,
  choices: AirportChoicesState,
): boolean {
  if (
    enriched._resolved.origin?.needsAgentChoice === true &&
    choices.origin === null
  ) {
    return false;
  }
  if (
    enriched._resolved.destination?.needsAgentChoice === true &&
    choices.destination === null
  ) {
    return false;
  }
  return true;
}

function airportChoicesForBuild(
  enriched: EnrichedTripRequest,
  choices: AirportChoicesState,
): AirportFlightChoices {
  return {
    origin:
      choices.origin ??
      enriched._resolved.origin?.selectedIata ??
      enriched._resolved.origin?.airports[0]?.iata ??
      "all",
    destination:
      choices.destination ??
      enriched._resolved.destination?.selectedIata ??
      enriched._resolved.destination?.airports[0]?.iata ??
      "all",
  };
}

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

function drawAgencyHeader(
  doc: jsPDF,
  variant: "dark" | "light",
  quoteReference: string,
) {
  const profile = readAgencyProfile();
  const isDark = variant === "dark";
  const logoX = 14;
  const logoY = 14;
  const logoSize = 24;
  const agencyName = profile.agencyName || "Travel Agency";

  function drawTextBrand() {
    doc.setFillColor(isDark ? 0 : 3, isDark ? 201 : 8, isDark ? 167 : 15);
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, "F");
    doc.setTextColor(isDark ? 3 : 0, isDark ? 8 : 201, isDark ? 15 : 167);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TQuot", logoX + 5, logoY + 10);
    doc.setFontSize(5);
    doc.text(agencyName.slice(0, 16), logoX + 3, logoY + 18, {
      maxWidth: logoSize - 6,
    });
  }

  if (profile.logoBase64) {
    try {
      doc.addImage(profile.logoBase64, "PNG", logoX, logoY, logoSize, logoSize);
    } catch {
      try {
        doc.addImage(profile.logoBase64, "JPEG", logoX, logoY, logoSize, logoSize);
      } catch {
        drawTextBrand();
      }
    }
  } else {
    drawTextBrand();
  }

  doc.setTextColor(isDark ? 255 : 3, isDark ? 255 : 8, isDark ? 255 : 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(agencyName, 44, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(isDark ? 139 : 100, isDark ? 156 : 116, isDark ? 179 : 139);
  const contactLines = [profile.email, profile.phone].filter(Boolean);
  doc.text(contactLines.slice(0, 3), 44, 27);
  doc.text(`Ref: ${quoteReference}`, 150, 20);
}

export function QuoteEngine() {
  const { locale, t } = useDashboardLanguage();
  const processSteps = useMemo(() => buildProcessSteps(t), [t]);
  const defaultStepChips = useMemo(
    () => processSteps.map((step) => step.chips),
    [processSteps],
  );
  const requestInputRef = useRef<HTMLTextAreaElement>(null);
  const [request, setRequest] = useState(t.defaultQuoteRequest);
  const [activeStep, setActiveStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [stepChips, setStepChips] = useState(defaultStepChips);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "ai", content: t.chatWelcome },
  ]);
  const [agentNotes, setAgentNotes] = useState(t.defaultAgentNotes);
  const [enrichedTrip, setEnrichedTrip] = useState<EnrichedTripRequest | null>(
    null,
  );
  const [airportChoices, setAirportChoices] = useState<AirportChoicesState>({
    origin: null,
    destination: null,
  });

  const awaitingAirportChoice =
    enrichedTrip !== null && needsAirportSelection(enrichedTrip);
  const airportChoiceComplete =
    enrichedTrip === null ||
    isAirportSelectionComplete(enrichedTrip, airportChoices);

  useEffect(() => {
    if (!isRunning) {
      setStepChips(defaultStepChips);
    }
  }, [defaultStepChips, isRunning]);

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

  function sendChatMessage() {
    const message = chatInput.trim();
    if (!message || !quote) return;

    const normalized = message.toLowerCase();
    let response = t.chatDefault;

    if (/cheaper|barato|bajar|economico|económico|reduce/.test(normalized)) {
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
    } else if (/insurance|seguro/.test(normalized)) {
      setQuote((current) => {
        if (!current || current.experiences.some((item) => item.id === "exp-insurance")) {
          return current;
        }
        const next = cloneQuote(current);
        const insurance: QuoteItem = {
          id: "exp-insurance",
          type: "experience",
          title: t.insuranceTitle,
          provider: t.insuranceProvider,
          price: 48,
          markup: 10,
          finalPrice: 58,
          source: "inventory",
        };
        next.experiences = [...next.experiences, insurance];
        syncQuotePricing(next);
        return next;
      });
      response = t.chatInsuranceAdded;
    } else if (/upgrade|mejor|subir|hotel/.test(normalized)) {
      setQuote((current) => {
        if (!current) return current;
        const next = cloneQuote(current);
        for (const hotel of itemsForPricing(next.hotels)) {
          hotel.price = Math.round(hotel.price * 1.18);
          applyItemMargin(hotel, getItemMarginPercent(hotel));
          hotel.title = `${hotel.title}${t.hotelUpgradeSuffix}`;
        }
        syncQuotePricing(next);
        return next;
      });
      response = t.chatHotelUpgrade;
    }

    setChatMessages((messages) => [
      ...messages,
      { role: "agent", content: message },
      { role: "ai", content: response },
    ]);
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
              t.chipParserSource,
            ]
          : chips,
      ),
    );
    await pipelineDelay();

    setActiveStep(2);
    const built = await buildQuote({
      ...parsedInput,
      enrichedTrip,
      airportChoices: choicesForBuild,
    });
    setQuote(built);
    setStepChips((current) =>
      current.map((chips, index) =>
        index === 2
          ? [
              formatMessage(t.chipFlightsCount, { count: built.flights.length }),
              formatMessage(t.chipHotelsCount, { count: built.hotels.length }),
              formatMessage(t.chipExperiencesCount, {
                count: built.experiences.length,
              }),
              formatCurrency(built.pricing.finalTotal, locale),
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
      await continueQuoteFromEnriched(enrichedTrip);
      return;
    }

    setIsRunning(true);
    setIsComplete(false);
    setQuote(null);
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
      setStepChips((current) =>
        current.map((chips, index) =>
          index === 0
            ? [t.chipParserNeedsDetails, ...parserResult.questions.slice(0, 2)]
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
                formatMessage(t.chipAdults, {
                  value: parserResult.data.adults ?? 2,
                }),
                t.chipTripRequestReady,
              ]
            : chips,
        ),
      );

      if (needsAirportSelection(enriched)) {
        setEnrichedTrip(enriched);
        setAirportChoices({ origin: null, destination: null });
        setActiveStep(0);
        setIsRunning(false);
        return;
      }

      await continueQuoteFromEnriched(enriched);
      return;
    }

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

  function generateAgentPDF() {
    if (!quote) return;

    const doc = new jsPDF();
    const quoteReference = quote.id;
    const items = allQuoteItems(quote);

    doc.setFillColor(3, 8, 15);
    doc.rect(0, 0, 210, 297, "F");

    drawAgencyHeader(doc, "dark", quoteReference);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(t.pdfAgentTitle, 14, 54);
    doc.setFontSize(10);
    doc.setTextColor(139, 156, 179);
    doc.text(formatMessage(t.pdfReference, { ref: quoteReference }), 14, 62);
    doc.text(
      formatMessage(t.pdfGenerated, {
        date: new Date().toLocaleString(locale === "es" ? "es-ES" : "en-US"),
      }),
      14,
      68,
    );

    autoTable(doc, {
      startY: 80,
      head: [
        [
          t.pdfTableLine,
          t.pdfTableSource,
          t.pdfTableBase,
          t.pdfTableMargin,
          t.pdfTableClient,
        ],
      ],
      body: items.map((item) => [
        `${item.title}\n${item.provider}`,
        `[${item.source}]`,
        formatCurrency(item.price, locale),
        formatCurrency(item.markup, locale),
        formatCurrency(item.finalPrice, locale),
      ]),
      theme: "grid",
      styles: {
        fillColor: [9, 18, 32],
        textColor: [232, 238, 247],
        lineColor: [37, 50, 66],
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [0, 201, 167],
        textColor: [3, 8, 15],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [12, 24, 39],
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const source = items[data.row.index]?.source;
          if (source) {
            data.cell.styles.textColor = sourcePdfColors[source];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY ?? 140;

    doc.setFillColor(9, 18, 32);
    doc.roundedRect(14, finalY + 10, 182, 30, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(t.pdfInternalTotals, 20, finalY + 20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(232, 238, 247);
    doc.text(
      formatMessage(t.pdfBase, {
        value: formatCurrency(quote.pricing.baseTotal, locale),
      }),
      20,
      finalY + 29,
    );
    doc.text(
      formatMessage(t.pdfMargin, {
        value: formatCurrency(quote.pricing.margin, locale),
      }),
      76,
      finalY + 29,
    );
    doc.setTextColor(0, 201, 167);
    doc.setFont("helvetica", "bold");
    doc.text(
      formatMessage(t.pdfClientTotal, {
        value: formatCurrency(quote.pricing.finalTotal, locale),
      }),
      140,
      finalY + 29,
    );

    doc.setTextColor(245, 197, 24);
    doc.setFontSize(11);
    doc.text(t.pdfAgentNotes, 14, finalY + 55);
    doc.setTextColor(139, 156, 179);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(agentNotes || t.pdfNoNotes, 14, finalY + 63, {
      maxWidth: 180,
    });

    doc.save(formatMessage(t.pdfFilenameAgent, { ref: quoteReference }));
  }

  function generateClientPDF() {
    if (!quote) return;

    const doc = new jsPDF();
    const quoteReference = quote.id;
    const items = pricedQuoteItemsFromQuote(quote);

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, "F");

    drawAgencyHeader(doc, "light", quoteReference);

    doc.setTextColor(3, 8, 15);
    doc.setFontSize(22);
    doc.text(t.pdfClientProposal, 14, 54);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(formatMessage(t.pdfReference, { ref: quoteReference }), 14, 62);
    doc.text(
      formatMessage(t.pdfClientDate, {
        date: new Date().toLocaleDateString(locale === "es" ? "es-ES" : "en-US"),
      }),
      14,
      68,
    );

    autoTable(doc, {
      startY: 82,
      head: [[t.pdfClientService, t.pdfClientProvider, t.pdfClientPrice]],
      body: items.map((item) => [
        item.title,
        item.provider,
        formatCurrency(item.finalPrice, locale),
      ]),
      theme: "striped",
      styles: {
        textColor: [15, 23, 42],
        fontSize: 9,
        cellPadding: 3,
        lineColor: [226, 232, 240],
      },
      headStyles: {
        fillColor: [3, 8, 15],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        2: {
          halign: "right",
          textColor: [0, 145, 122],
          fontStyle: "bold",
        },
      },
    });

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY ?? 130;

    doc.setFillColor(240, 253, 250);
    doc.roundedRect(120, finalY + 12, 76, 24, 3, 3, "F");
    doc.setTextColor(3, 8, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(t.pdfClientTotalLabel, 126, finalY + 22);
    doc.setTextColor(0, 145, 122);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(formatCurrency(quote.pricing.finalTotal, locale), 126, finalY + 32);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(t.pdfDisclaimer, 14, 282, { maxWidth: 182 });

    doc.save(formatMessage(t.pdfFilenameClient, { ref: quoteReference }));
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03080F] px-4 py-8 text-[#E8EEF7] sm:px-6 lg:px-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_-12%,rgba(0,201,167,0.20),transparent_62%),radial-gradient(circle_at_12%_18%,rgba(74,106,133,0.22),transparent_28%),linear-gradient(180deg,rgba(3,8,15,0)_0%,#03080F_72%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(920px,80vw)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#00C9A7]/70 to-transparent"
        aria-hidden
      />

      <main className="relative mx-auto max-w-7xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-sm text-[#8B9CB3] shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition-colors hover:border-[#00C9A7]/30 hover:text-[#00C9A7]"
        >
          ← {t.backToDashboard}
        </Link>

        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(10,21,37,0.88),rgba(13,32,56,0.68))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45),0_0_60px_rgba(0,201,167,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#00C9A7]">
              TQuot AI Engine
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              {t.newQuote}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#8B9CB3]">
              {t.quoteEngineSubtitle}
            </p>
          </div>
          <LocaleToggleButtons />
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <PremiumMetric label={t.metricFlow} value={t.metricFlowValue} />
            <PremiumMetric label={t.metricEngine} value={t.metricEngineValue} />
            <PremiumMetric label={t.metricOutput} value={t.metricOutputValue} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[1.75rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(9,18,32,0.92),rgba(3,8,15,0.72))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <label
              htmlFor="client-request"
              className="mb-3 block text-sm font-medium text-[#E8EEF7]"
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
              }}
              rows={10}
              className="w-full resize-y rounded-2xl border border-white/10 bg-[#03080F]/70 px-4 py-4 text-[#E8EEF7] shadow-inner shadow-black/30 placeholder:text-[#8B9CB3]/50 outline-none transition-colors focus:border-[#00C9A7]/50 focus:ring-2 focus:ring-[#00C9A7]/20"
              placeholder={t.quoteEngineRequestPlaceholder}
            />

            {awaitingAirportChoice && enrichedTrip ? (
              <div className="mt-6 space-y-4">
                {enrichedTrip._resolved.origin?.needsAgentChoice ? (
                  <AirportPicker
                    label="Origen"
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
                    label="Destino"
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

            <button
              type="button"
              onClick={runQuoteEngine}
              disabled={
                !request.trim() ||
                isRunning ||
                (awaitingAirportChoice && !airportChoiceComplete)
              }
              className="mt-6 w-full rounded-2xl bg-[#00C9A7] px-8 py-4 text-sm font-bold text-[#03080F] shadow-[0_0_42px_-8px_rgba(0,201,167,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#00E5BB] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isRunning ? t.processing : t.generateQuote}
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(9,18,32,0.92),rgba(3,8,15,0.72))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#00C9A7]">
                  {t.livePipeline}
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  {t.processStepByStep}
                </h2>
              </div>
              <span className="rounded-full border border-[#00C9A7]/25 bg-[#00C9A7]/10 px-3 py-1 text-xs font-semibold text-[#00C9A7]">
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
          <section className="mt-8 rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(9,18,32,0.94),rgba(3,8,15,0.78))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#00C9A7]">
                  {t.proposalWorkspace}
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  {t.compiledQuote}
                </h2>
                <p className="mt-1 text-sm text-[#8B9CB3]">
                  {formatMessage(t.quoteRefSummary, {
                    id: quote.id,
                    route: quote.summary.route,
                    days: quote.summary.durationDays,
                    travelers: quote.summary.passengers.total,
                  })}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={generateAgentPDF}
                  className="rounded-2xl border border-[#00C9A7]/30 bg-[#00C9A7]/10 px-5 py-3 text-sm font-semibold text-[#00C9A7] transition-colors hover:bg-[#00C9A7]/15"
                >
                  {t.pdfAgent}
                </button>
                <button
                  type="button"
                  onClick={generateClientPDF}
                  className="rounded-2xl bg-[#00C9A7] px-5 py-3 text-sm font-bold text-[#03080F] shadow-[0_0_34px_-10px_rgba(0,201,167,0.9)] transition-colors hover:bg-[#00E5BB]"
                >
                  {t.pdfClient}
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-3">
              {quote.flights.length > 0 ? (
                <div>
                  <DataSourceBadge source={quote._meta.flightsSource} />
                  <QuoteItemsSection
                    eyebrow={t.sectionFlightsEyebrow}
                    title={t.sectionFlightsTitle}
                    items={quote.flights}
                    onSelectItem={handleSelectQuoteItem}
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
                  />
                </div>
              ) : null}
              {quote.experiences.length > 0 ? (
                <QuoteItemsSection
                  eyebrow={t.sectionExperiencesEyebrow}
                  title={t.sectionExperiencesTitle}
                  items={quote.experiences}
                  onMarginChange={handleQuoteItemMarginChange}
                />
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-white/[0.08] bg-[#03080F]/60 p-5 shadow-[0_16px_44px_rgba(0,0,0,0.22)]">
                <h3 className="mb-3 text-lg font-semibold text-white">
                  {t.aiRefinementChat}
                </h3>
                <div className="mb-4 max-h-56 space-y-3 overflow-y-auto pr-1">
                  {chatMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`rounded-xl px-4 py-3 text-sm ${
                        message.role === "ai"
                          ? "border border-[#00C9A7]/20 bg-[#00C9A7]/10 text-[#00C9A7]"
                          : "bg-white/[0.05] text-[#E8EEF7]"
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
                    placeholder='Try "make cheaper", "add insurance", "upgrade hotel"'
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#00C9A7]/50"
                  />
                  <button
                    type="button"
                    onClick={sendChatMessage}
                    className="rounded-2xl bg-[#00C9A7] px-4 py-3 text-sm font-bold text-[#03080F]"
                  >
                    {t.send}
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-white/[0.08] bg-[#03080F]/60 p-5 shadow-[0_16px_44px_rgba(0,0,0,0.22)]">
                <label className="mb-3 block text-lg font-semibold text-white">
                  {t.agentNotes}
                </label>
                <textarea
                  value={agentNotes}
                  onChange={(event) => setAgentNotes(event.target.value)}
                  rows={8}
                  className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#00C9A7]/50"
                />
              </section>
            </div>

            <div className="mt-6 grid gap-4 rounded-3xl border border-[#00C9A7]/20 bg-[linear-gradient(135deg,rgba(0,201,167,0.14),rgba(13,32,56,0.48))] p-5 shadow-[0_0_50px_-24px_rgba(0,201,167,0.9)] sm:grid-cols-3">
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
    </div>
  );
}

function DataSourceBadge({ source }: { source: QuoteDataSource }) {
  if (source === "real") {
    return (
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
        ✓ Datos reales
      </span>
    );
  }

  return (
    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
      ⚠ Datos de ejemplo
    </span>
  );
}

function PremiumMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#03080F]/45 px-4 py-3 shadow-inner shadow-black/25">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#4A6A85]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
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
      className={`relative overflow-hidden rounded-3xl border p-4 transition-all ${
        status === "active"
          ? "border-[#00C9A7]/45 bg-[linear-gradient(135deg,rgba(0,201,167,0.16),rgba(13,32,56,0.42))] shadow-[0_0_46px_-20px_rgba(0,201,167,0.95)]"
          : status === "done"
            ? "border-emerald-400/25 bg-emerald-400/[0.06]"
            : "border-white/[0.06] bg-[#03080F]/48"
      }`}
    >
      {status === "active" ? (
        <div
          className="absolute inset-x-0 top-0 h-px animate-pulse bg-gradient-to-r from-transparent via-[#00C9A7] to-transparent"
          aria-hidden
        />
      ) : null}
      <div className="flex items-center gap-3">
        <StepIndicator status={status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">{title}</p>
            <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8B9CB3] sm:inline-flex">
              {String(index + 1).padStart(2, "0")} · {statusLabel}
            </span>
          </div>
          {status === "active" ? (
            <div className="mt-3 flex items-center gap-1.5">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00C9A7]"
                  style={{ animationDelay: `${dot * 140}ms` }}
                />
              ))}
              <span className="ml-2 text-xs text-[#8B9CB3]">
                {labels.searching}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      {status !== "pending" ? (
        <div className="mt-3 flex flex-wrap gap-2 pl-9">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-[#00C9A7]/20 bg-[#00C9A7]/10 px-2.5 py-1 text-xs font-medium text-[#00C9A7]"
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
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-[#03080F] shadow-[0_0_24px_rgba(52,211,153,0.35)]">
        ✓
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-[#00C9A7]/35 bg-[#00C9A7]/10">
        <span className="absolute h-7 w-7 animate-ping rounded-full border border-[#00C9A7]/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#00C9A7] shadow-[0_0_18px_rgba(0,201,167,0.8)]" />
      </span>
    );
  }

  return <span className="h-7 w-7 rounded-full border border-white/15 bg-white/[0.03]" />;
}

function TotalCard({
  label,
  value,
  highlight,
  locale,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  locale: Locale;
}) {
  return (
    <div>
      <p className="text-sm text-[#8B9CB3]">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight ? "text-[#00C9A7]" : "text-white"
        }`}
      >
        {formatCurrency(value, locale)}
      </p>
    </div>
  );
}
