"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  applyItemMargin,
  buildQuote,
  getItemMarginPercent,
  itemsForPricing,
  pricedQuoteItemsFromQuote,
  selectPrimaryInGroup,
  syncQuotePricing,
  type Quote,
  type QuoteItem,
  type QuoteItemSource,
} from "@/lib/quotes/build-quote";
import {
  addDaysIso,
  localParseToParsedTripInput,
  parseDatesFromText,
  tripRequestToParsedTripInput,
} from "@/lib/quotes/map-parser";
import type { TripRequest } from "@/lib/parser/schema";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { readAgencyProfile } from "../agency/agency-profile";
import { useDashboardLanguage } from "../dashboard-language-provider";
import type { Locale } from "../translations";
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

type ParsedRequest = {
  destination: string;
  origin?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  includeFlights: boolean;
};

const PROCESS_STEPS: ProcessStep[] = [
  {
    title: "ðŸ§  Parsing client request",
    chips: ["Parser API", "TripRequest extracted"],
  },
  {
    title: "ðŸ“‹ Mapping ParsedTripInput",
    chips: ["Route & dates", "Passengers & preferences"],
  },
  {
    title: "ðŸ’° Building deterministic quote",
    chips: ["Flights", "Hotels", "Experiences", "Margins applied"],
  },
];

const defaultStepChips = PROCESS_STEPS.map((step) => step.chips);

const sourceStyles: Record<QuoteItemSource, string> = {
  mock: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  inventory: "border-[#00C9A7]/30 bg-[#00C9A7]/10 text-[#00C9A7]",
  api: "border-purple-400/30 bg-purple-400/10 text-purple-300",
};

const sourcePdfColors: Record<QuoteItemSource, [number, number, number]> = {
  mock: [148, 163, 184],
  inventory: [0, 201, 167],
  api: [168, 85, 247],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStepStatus(index: number, activeStep: number, isRunning: boolean) {
  if (!isRunning && activeStep < 0) return "pending";
  if (index < activeStep) return "done";
  if (index === activeStep && isRunning) return "active";
  if (activeStep >= PROCESS_STEPS.length) return "done";
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
  };
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function cleanPlaceName(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(
      /\s+(?:del|al|desde|hasta|para|con|sin|check|entrada|salida|adultos|adulto|personas|persona|pax|noches?|nights?|hotel|hoteles|vuelo|vuelos|flight|flights|from|to|on|for|with|adults|people|travellers|travelers)\b.*$/iu,
      "",
    )
    .replace(/\s+\d{1,4}.*$/u, "")
    .replace(/[,.]$/, "")
    .trim();
}

function matchKeyword(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanPlaceName(match[1]);
  }

  return "";
}

function extractBareFlightRoute(text: string) {
  const match = text.match(/\bvuelos?\s+([\p{L}\p{M}\s.'-]+)/iu);
  if (!match?.[1]) {
    return { origin: "", destination: "" };
  }

  const routeText = cleanPlaceName(match[1]);
  const parts = routeText.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return { origin: "", destination: routeText };
  }

  return {
    origin: parts[0],
    destination: parts.slice(1).join(" "),
  };
}

function parseRequest(text: string): ParsedRequest | null {
  const today = new Date();
  const sourceText = text.trim();
  const bareFlightRoute = extractBareFlightRoute(sourceText);
  const destination =
    matchKeyword(sourceText, [
      /\bhoteles?\s+en\s+([\p{L}\p{M}\s.'-]+)/iu,
      /\bhoteles?\s+([\p{L}\p{M}\s.'-]+)/iu,
      /\bhotel\s+([\p{L}\p{M}\s.'-]+)/iu,
      /\bviaje\s+a\s+([\p{L}\p{M}\s.'-]+)/iu,
      /\bvuelo\s+a\s+([\p{L}\p{M}\s.'-]+)/iu,
      /\bvuelos?\s+a\s+([\p{L}\p{M}\s.'-]+)/iu,
      /\b([\p{L}\p{M}\s.'-]+?)\s+\d+\s+noches?\b/iu,
      /\bpara\s+([\p{L}\p{M}\s.'-]+)/iu,
      /\ben\s+([\p{L}\p{M}\s.'-]+)/iu,
      /\ba\s+([\p{L}\p{M}\s.'-]+)/iu,
    ]) || bareFlightRoute.destination;

  if (!destination) {
    return null;
  }

  const origin = matchKeyword(sourceText, [
    /\bdesde\s+([\p{L}\p{M}\s.'-]+?)\s+\b(?:a|hasta)\b/iu,
    /\bde\s+([\p{L}\p{M}\s.'-]+?)\s+\ba\b/iu,
    /\bfrom\s+([\p{L}\p{M}\s.'-]+?)\s+\bto\b/iu,
  ]) || bareFlightRoute.origin;

  const extractedDates = parseDatesFromText(sourceText);
  const todayIso = today.toISOString().slice(0, 10);
  const checkIn = extractedDates?.start ?? todayIso;
  const checkOut = extractedDates?.end ?? addDaysIso(checkIn, 3);

  const adultsMatch = sourceText.match(
    /\b(\d+)\s*(?:adults?|adultos?|people|personas?|pax|travellers?|viajeros?)\b/i,
  );
  const includeFlights = /\b(?:vuelo|vuelos|flight|flights|volar|desde|from)\b/i.test(
    sourceText,
  );

  return {
    destination,
    origin: origin || undefined,
    checkIn,
    checkOut,
    adults: adultsMatch ? Number(adultsMatch[1]) : 2,
    includeFlights,
  };
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
  const { locale, setLocale, t } = useDashboardLanguage();
  const requestInputRef = useRef<HTMLTextAreaElement>(null);
  const [request, setRequest] = useState(
    "Necesito un viaje para 2 adultos a Ribadesella, 3 noches, hotel con encanto, vuelos desde Madrid y una experiencia local.",
  );
  const [activeStep, setActiveStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [stepChips, setStepChips] = useState(defaultStepChips);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        'Puedes pedirme: "make cheaper", "add insurance" o "upgrade hotel".',
    },
  ]);
  const [agentNotes, setAgentNotes] = useState(
    "Revisar disponibilidad antes de confirmar. Validar condiciones de cancelaciÃ³n.",
  );

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
    let response =
      "He revisado la cotizaciÃ³n. Puedes pedirme bajar precio, aÃ±adir seguro o mejorar hotel.";

    if (/cheaper|barato|bajar|econ[oÃ³]mico|reduce/.test(normalized)) {
      setQuote((current) => {
        if (!current) return current;
        const next = cloneQuote(current);
        for (const item of pricedQuoteItemsFromQuote(next)) {
          applyItemMargin(item, getItemMarginPercent(item) * 0.85);
        }
        syncQuotePricing(next);
        return next;
      });
      response = "He reducido los mÃ¡rgenes para hacer la propuesta mÃ¡s econÃ³mica.";
    } else if (/insurance|seguro/.test(normalized)) {
      setQuote((current) => {
        if (!current || current.experiences.some((item) => item.id === "exp-insurance")) {
          return current;
        }
        const next = cloneQuote(current);
        const insurance: QuoteItem = {
          id: "exp-insurance",
          type: "experience",
          title: "Seguro de viaje premium",
          provider: "Proveedor corporativo",
          price: 48,
          markup: 10,
          finalPrice: 58,
          source: "inventory",
        };
        next.experiences = [...next.experiences, insurance];
        syncQuotePricing(next);
        return next;
      });
      response = "He aÃ±adido un seguro de viaje premium.";
    } else if (/upgrade|mejor|subir|hotel/.test(normalized)) {
      setQuote((current) => {
        if (!current) return current;
        const next = cloneQuote(current);
        for (const hotel of itemsForPricing(next.hotels)) {
          hotel.price = Math.round(hotel.price * 1.18);
          applyItemMargin(hotel, getItemMarginPercent(hotel));
          hotel.title = `${hotel.title} · upgrade`;
        }
        syncQuotePricing(next);
        return next;
      });
      response = "He aplicado un upgrade de hotel y recalculado el precio.";
    }

    setChatMessages((messages) => [
      ...messages,
      { role: "agent", content: message },
      { role: "ai", content: response },
    ]);
    setChatInput("");
  }

  async function runQuoteEngine() {
    const latestRequest = requestInputRef.current?.value ?? request;
    setRequest(latestRequest);
    setIsRunning(true);
    setIsComplete(false);
    setQuote(null);
    setStepChips(defaultStepChips);
    setActiveStep(0);

    let parsedInput = null as ReturnType<typeof tripRequestToParsedTripInput>;
    let parserSource = "local";

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
            ? [
                "Parser needs more details",
                ...parserResult.questions.slice(0, 2),
              ]
            : chips,
        ),
      );
      setIsRunning(false);
      return;
    }

    if (parserResult.ok && parserResult.status === "ready") {
      parsedInput = tripRequestToParsedTripInput(parserResult.data);
      parserSource = "parser";
      setStepChips((current) =>
        current.map((chips, index) =>
          index === 0
            ? [
                `Destino: ${parserResult.data.destination}`,
                `Adultos: ${parserResult.data.adults ?? 2}`,
                "TripRequest ready",
              ]
            : chips,
        ),
      );
    }

    if (!parsedInput) {
      const localParsed = parseRequest(latestRequest);
      if (!localParsed) {
        setStepChips((current) =>
          current.map((chips, index) =>
            index === 0
              ? [
                  "Destination not detected",
                  "Especifica destino: hoteles en Ribadesella / viaje a Roma",
                ]
              : chips,
          ),
        );
        setIsRunning(false);
        return;
      }
      parsedInput = localParseToParsedTripInput(localParsed);
      parserSource = "local";
      const fallbackLabel =
        parserResult.ok === false && parserResult.reason === "timeout"
          ? "Parser timeout (10s) · extracción local"
          : "Extracción local (fallback)";
      setStepChips((current) =>
        current.map((chips, index) =>
          index === 0
            ? [
                `Destino: ${localParsed.destination}`,
                `${localParsed.adults} viajeros`,
                fallbackLabel,
              ]
            : chips,
        ),
      );
    }

    await pipelineDelay();

    setActiveStep(1);
    setStepChips((current) =>
      current.map((chips, index) =>
        index === 1
          ? [
              `${parsedInput.origin} â†’ ${parsedInput.destination}`,
              `${parsedInput.dates.start} â†’ ${parsedInput.dates.end}`,
              `Fuente: ${parserSource}`,
            ]
          : chips,
      ),
    );
    await pipelineDelay();

    setActiveStep(2);
    const built = await buildQuote(parsedInput);
    setQuote(built);
    setStepChips((current) =>
      current.map((chips, index) =>
        index === 2
          ? [
              `${built.flights.length} vuelos`,
              `${built.hotels.length} hoteles`,
              `${built.experiences.length} experiencias`,
              formatCurrency(built.pricing.finalTotal),
            ]
          : chips,
      ),
    );
    await pipelineDelay();

    setActiveStep(PROCESS_STEPS.length);
    setIsRunning(false);
    setIsComplete(true);
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
    doc.text("COTIZACION INTERNA - CONFIDENCIAL", 14, 54);
    doc.setFontSize(10);
    doc.setTextColor(139, 156, 179);
    doc.text(`Referencia: ${quoteReference}`, 14, 62);
    doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, 14, 68);

    autoTable(doc, {
      startY: 80,
      head: [["Linea", "Fuente", "Base", "Margen", "Cliente"]],
      body: items.map((item) => [
        `${item.title}\n${item.provider}`,
        `[${item.source}]`,
        formatCurrency(item.price),
        formatCurrency(item.markup),
        formatCurrency(item.finalPrice),
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
    doc.text("Totales internos", 20, finalY + 20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(232, 238, 247);
    doc.text(`Base: ${formatCurrency(quote.pricing.baseTotal)}`, 20, finalY + 29);
    doc.text(
      `Margen: ${formatCurrency(quote.pricing.margin)}`,
      76,
      finalY + 29,
    );
    doc.setTextColor(0, 201, 167);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Total cliente: ${formatCurrency(quote.pricing.finalTotal)}`,
      140,
      finalY + 29,
    );

    doc.setTextColor(245, 197, 24);
    doc.setFontSize(11);
    doc.text("Notas para agente", 14, finalY + 55);
    doc.setTextColor(139, 156, 179);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(agentNotes || "Sin notas adicionales.", 14, finalY + 63, {
      maxWidth: 180,
    });

    doc.save(`${quoteReference}-agente.pdf`);
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
    doc.text("PROPUESTA DE VIAJE", 14, 54);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Referencia: ${quoteReference}`, 14, 62);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 14, 68);

    autoTable(doc, {
      startY: 82,
      head: [["Servicio", "Proveedor", "Precio cliente"]],
      body: items.map((item) => [
        item.title,
        item.provider,
        formatCurrency(item.finalPrice),
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
    doc.text("Precio total cliente", 126, finalY + 22);
    doc.setTextColor(0, 145, 122);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(formatCurrency(quote.pricing.finalTotal), 126, finalY + 32);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      "Propuesta no vinculante. Precios sujetos a disponibilidad y pueden variar hasta confirmacion de reserva.",
      14,
      282,
      { maxWidth: 182 },
    );

    doc.save(`${quoteReference}-cliente.pdf`);
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
          â† {t.backToDashboard}
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
              Pega una solicitud de cliente: el parser extrae el viaje,
              buildQuote genera la cotizaciÃ³n determinista y puedes exportar PDF.
            </p>
          </div>
          <div className="flex w-fit rounded-full border border-white/10 bg-[#03080F]/60 p-1 shadow-inner shadow-black/30">
            {(["es", "en"] as Locale[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  locale === code
                    ? "bg-[#00C9A7] text-[#03080F]"
                    : "text-[#8B9CB3] hover:text-white"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <PremiumMetric label="Flujo" value="Parser â†’ buildQuote" />
            <PremiumMetric label="Motor" value="Determinista" />
            <PremiumMetric label="Salida" value="PDF agente / cliente" />
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
              onChange={(event) => setRequest(event.target.value)}
              rows={10}
              className="w-full resize-y rounded-2xl border border-white/10 bg-[#03080F]/70 px-4 py-4 text-[#E8EEF7] shadow-inner shadow-black/30 placeholder:text-[#8B9CB3]/50 outline-none transition-colors focus:border-[#00C9A7]/50 focus:ring-2 focus:ring-[#00C9A7]/20"
              placeholder="Ej: 2 adultos a Ribadesella, 3 noches, hotel boutique, vuelos desde Madrid..."
            />

            <button
              type="button"
              onClick={runQuoteEngine}
              disabled={!request.trim() || isRunning}
              className="mt-6 w-full rounded-2xl bg-[#00C9A7] px-8 py-4 text-sm font-bold text-[#03080F] shadow-[0_0_42px_-8px_rgba(0,201,167,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#00E5BB] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isRunning ? "Procesando..." : t.generateQuote}
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(9,18,32,0.92),rgba(3,8,15,0.72))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#00C9A7]">
                  Live pipeline
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  Proceso IA paso a paso
                </h2>
              </div>
              <span className="rounded-full border border-[#00C9A7]/25 bg-[#00C9A7]/10 px-3 py-1 text-xs font-semibold text-[#00C9A7]">
                {isRunning ? "En curso" : isComplete ? "Completado" : "Listo"}
              </span>
            </div>
            <div className="space-y-3">
              {PROCESS_STEPS.map((step, index) => {
                const status = getStepStatus(index, activeStep, isRunning);
                return (
                  <ProcessStepCard
                    key={step.title}
                    index={index}
                    status={status}
                    title={step.title}
                    chips={stepChips[index]}
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
                  Proposal workspace
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  CotizaciÃ³n compilada
                </h2>
                <p className="mt-1 text-sm text-[#8B9CB3]">
                  Ref: {quote.id} Â· {quote.summary.route} Â· {quote.summary.durationDays}{" "}
                  dÃ­as Â· {quote.summary.passengers.total} viajeros
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={generateAgentPDF}
                  className="rounded-2xl border border-[#00C9A7]/30 bg-[#00C9A7]/10 px-5 py-3 text-sm font-semibold text-[#00C9A7] transition-colors hover:bg-[#00C9A7]/15"
                >
                  PDF Agente
                </button>
                <button
                  type="button"
                  onClick={generateClientPDF}
                  className="rounded-2xl bg-[#00C9A7] px-5 py-3 text-sm font-bold text-[#03080F] shadow-[0_0_34px_-10px_rgba(0,201,167,0.9)] transition-colors hover:bg-[#00E5BB]"
                >
                  PDF Cliente
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-3">
              {quote.flights.length > 0 ? (
                <QuoteItemsSection
                  eyebrow="Vuelos"
                  title="Flights"
                  items={quote.flights}
                  onSelectItem={handleSelectQuoteItem}
                  onMarginChange={handleQuoteItemMarginChange}
                />
              ) : null}
              {quote.hotels.length > 0 ? (
                <QuoteItemsSection
                  eyebrow="Hoteles"
                  title="Hotels"
                  items={quote.hotels}
                  onSelectItem={handleSelectQuoteItem}
                  onMarginChange={handleQuoteItemMarginChange}
                />
              ) : null}
              {quote.experiences.length > 0 ? (
                <QuoteItemsSection
                  eyebrow="Experiencias"
                  title="Experiences"
                  items={quote.experiences}
                  onMarginChange={handleQuoteItemMarginChange}
                />
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-white/[0.08] bg-[#03080F]/60 p-5 shadow-[0_16px_44px_rgba(0,0,0,0.22)]">
                <h3 className="mb-3 text-lg font-semibold text-white">
                  AI refinement chat
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
                        {message.role === "ai" ? "AI" : "Agent"}:
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
                    Send
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-white/[0.08] bg-[#03080F]/60 p-5 shadow-[0_16px_44px_rgba(0,0,0,0.22)]">
                <label className="mb-3 block text-lg font-semibold text-white">
                  Agent notes
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
              <TotalCard label="Base total" value={quote.pricing.baseTotal} />
              <TotalCard label="Margin" value={quote.pricing.margin} />
              <TotalCard
                label={`Final total (${quote.pricing.currency})`}
                value={quote.pricing.finalTotal}
                highlight
              />
            </div>
          </section>
        ) : null}
      </main>
    </div>
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
}: {
  index: number;
  status: StepStatus;
  title: string;
  chips: string[];
}) {
  const statusLabel =
    status === "active" ? "Procesando" : status === "done" ? "Hecho" : "Pendiente";

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
              {String(index + 1).padStart(2, "0")} Â· {statusLabel}
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
                Buscando la mejor fuente disponible
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
        âœ“
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
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-[#8B9CB3]">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight ? "text-[#00C9A7]" : "text-white"
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}
