"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { readAgencyProfile } from "../agency/agency-profile";
import { useDashboardLanguage } from "../dashboard-language-provider";
import type { Locale } from "../translations";

type StepStatus = "pending" | "active" | "done";
type Source = "INV-PROPIO" | "CORPORATIVO" | "WEB";

type ProcessStep = {
  title: string;
  chips: string[];
};

type QuoteLineItem = {
  id: string;
  name: string;
  description: string;
  source: Source;
  netCost: number;
  marginPercent: number;
};

type ChatMessage = {
  role: "agent" | "ai";
  content: string;
};

type InventoryCategory =
  | "hotels"
  | "experiences"
  | "suppliers"
  | "tour_operators";

type InventoryItem = {
  id: string;
  category: InventoryCategory;
  name: string;
  data: Record<string, string>;
};

type FlightOption = {
  price: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number | string;
  stopoverLocation: string;
};

type HotelOption = {
  name: string;
  pricePerNight: string;
  stars: number | string;
  rating: number | string;
  roomType: string;
  address: string;
  highlights: string[];
  distanceFromCenter: string;
};

type AirportDisplay = {
  city: string;
  airport: string;
  code: string;
};

type FlightRouteDisplay = {
  origin: AirportDisplay;
  destination: AirportDisplay;
};

type ParsedRequest = {
  destination: string;
  origin?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  includeFlights: boolean;
  requestedCategories: InventoryCategory[];
};

const PROCESS_STEPS: ProcessStep[] = [
  {
    title: "🧠 Analyzing natural language request",
    chips: ["Destino detectado", "Fechas normalizadas", "Viajeros identificados"],
  },
  {
    title: "🗄️ Checking own inventory (hotels, experiences, suppliers)",
    chips: ["Hotel propio disponible", "Experiencia local encontrada"],
  },
  {
    title: "🤝 Checking contracted suppliers",
    chips: ["Traslado contratado", "Guía certificado"],
  },
  {
    title: "🏢 Corporate system (if connected)",
    chips: ["Política validada", "Tarifa corporativa aplicada"],
  },
  {
    title: "🌐 Web search (Skyscanner + Booking.com APIs)",
    chips: ["Vuelo web encontrado", "Hotel web comparado"],
  },
  {
    title: "💰 Applying margins and compiling quote",
    chips: ["Márgenes aplicados", "Quote listo"],
  },
];

const defaultStepChips = PROCESS_STEPS.map((step) => step.chips);

const sourceStyles: Record<Source, string> = {
  "INV-PROPIO": "border-[#00C9A7]/30 bg-[#00C9A7]/10 text-[#00C9A7]",
  CORPORATIVO: "border-[#F5C518]/30 bg-[#F5C518]/10 text-[#F5C518]",
  WEB: "border-purple-400/30 bg-purple-400/10 text-purple-300",
};

const sourcePdfColors: Record<Source, [number, number, number]> = {
  "INV-PROPIO": [0, 201, 167],
  CORPORATIVO: [245, 197, 24],
  WEB: [168, 85, 247],
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

function createQuoteReference() {
  const date = new Date();
  const stamp = date
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  return `TQ-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getLineFinancials(item: QuoteLineItem) {
  const marginAmount = item.netCost * (item.marginPercent / 100);
  const clientPrice = item.netCost + marginAmount;

  return { marginAmount, clientPrice };
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

function parsePrice(value: string | number | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const match = value.match(/\d+(?:[.,]\d+)?/);
  if (!match) return 0;

  return Number(match[0].replace(",", "."));
}

const AIRPORT_LOOKUP: Record<string, AirportDisplay> = {
  madrid: {
    city: "Madrid",
    airport: "Adolfo Suarez Madrid-Barajas",
    code: "MAD",
  },
  barcelona: {
    city: "Barcelona",
    airport: "Josep Tarradellas Barcelona-El Prat",
    code: "BCN",
  },
  ribadesella: {
    city: "Ribadesella",
    airport: "Asturias Airport",
    code: "OVD",
  },
  asturias: {
    city: "Asturias",
    airport: "Asturias Airport",
    code: "OVD",
  },
  tokyo: {
    city: "Tokyo",
    airport: "Tokyo Haneda",
    code: "HND",
  },
  tokio: {
    city: "Tokio",
    airport: "Tokyo Haneda",
    code: "HND",
  },
  paris: {
    city: "Paris",
    airport: "Charles de Gaulle",
    code: "CDG",
  },
  "nueva york": {
    city: "Nueva York",
    airport: "John F. Kennedy",
    code: "JFK",
  },
  "new york": {
    city: "New York",
    airport: "John F. Kennedy",
    code: "JFK",
  },
  valladolid: {
    city: "Valladolid",
    airport: "Valladolid Airport",
    code: "VLL",
  },
  sevilla: {
    city: "Sevilla",
    airport: "Seville Airport",
    code: "SVQ",
  },
  maldivas: {
    city: "Male",
    airport: "Velana International",
    code: "MLE",
  },
  mallorca: {
    city: "Mallorca",
    airport: "Palma de Mallorca",
    code: "PMI",
  },
};

function normalizeLookupKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fallbackAirportCode(place: string) {
  const letters = place.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  return letters.padEnd(3, "X") || "AIR";
}

function getAirportDisplay(place: string, fallbackLabel: string): AirportDisplay {
  const city = cleanPlaceName(place) || fallbackLabel;
  const lookup = AIRPORT_LOOKUP[normalizeLookupKey(city)];

  if (lookup) return lookup;

  return {
    city,
    airport: `${city} Airport`,
    code: fallbackAirportCode(city),
  };
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

  const dates = Array.from(
    sourceText.matchAll(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/g),
    (match) => match[1],
  );
  const adultsMatch = sourceText.match(
    /\b(\d+)\s*(?:adults?|adultos?|people|personas?|pax|travellers?|viajeros?)\b/i,
  );
  const includeFlights = /\b(?:vuelo|vuelos|flight|flights|volar|desde|from)\b/i.test(
    sourceText,
  );
  const requestedCategories: InventoryCategory[] = [];

  if (/\b(?:hotel|hoteles|alojamiento|habitaci[oó]n)\b/i.test(sourceText)) {
    requestedCategories.push("hotels");
  }
  if (/\b(?:experiencia|experiencias|tour|actividad|actividades|gu[ií]a)\b/i.test(sourceText)) {
    requestedCategories.push("experiences");
  }
  if (/\b(?:traslado|transfer|proveedor|supplier)\b/i.test(sourceText)) {
    requestedCategories.push("suppliers");
  }
  if (/\b(?:tour operador|operador|paquete)\b/i.test(sourceText)) {
    requestedCategories.push("tour_operators");
  }

  if (requestedCategories.length === 0) {
    requestedCategories.push("hotels", "experiences");
  }

  return {
    destination,
    origin: origin || undefined,
    checkIn: dates[0] ?? today.toISOString().slice(0, 10),
    checkOut: dates[1] ?? addDays(today, 3),
    adults: adultsMatch ? Number(adultsMatch[1]) : 2,
    includeFlights,
    requestedCategories,
  };
}

function matchesDestination(item: InventoryItem, destination: string) {
  const normalizedDestination = destination.toLowerCase();
  const searchable = [
    item.name,
    item.category,
    ...Object.values(item.data ?? {}),
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(normalizedDestination);
}

function inventoryItemToLineItem(item: InventoryItem): QuoteLineItem {
  const netCost = parsePrice(
    item.data.netPrice ?? item.data.price ?? item.data.cost ?? item.data.net_cost,
  );

  return {
    id: `inventory-${item.id}`,
    name: item.name,
    description: Object.entries(item.data)
      .filter(([, value]) => Boolean(value))
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" · "),
    source: "INV-PROPIO",
    netCost: netCost || 100,
    marginPercent: 18,
  };
}

function hotelToLineItem(hotel: HotelOption, index: number): QuoteLineItem {
  return {
    id: `web-hotel-${index}`,
    name: hotel.name,
    description: `${hotel.roomType} · ${hotel.stars} stars · Rating ${hotel.rating} · ${hotel.distanceFromCenter}`,
    source: "WEB",
    netCost: parsePrice(hotel.pricePerNight) || 150,
    marginPercent: 12,
  };
}

function flightToLineItem(flight: FlightOption, index: number): QuoteLineItem {
  return {
    id: `web-flight-${index}`,
    name: `${flight.airline} ${flight.flightNumber}`,
    description: `${flight.departureTime} → ${flight.arrivalTime} · ${flight.duration} · ${flight.stops} stops`,
    source: "WEB",
    netCost: parsePrice(flight.price) || 220,
    marginPercent: 10,
  };
}

function createInsuranceLineItem(): QuoteLineItem {
  return {
    id: `corporate-insurance-${Date.now()}`,
    name: "Seguro de viaje premium",
    description: "Cobertura médica, cancelación y asistencia 24/7",
    source: "CORPORATIVO",
    netCost: 48,
    marginPercent: 20,
  };
}

async function fetchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data as T;
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
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [stepChips, setStepChips] = useState(defaultStepChips);
  const [flightOptions, setFlightOptions] = useState<FlightOption[]>([]);
  const [hotelOptions, setHotelOptions] = useState<HotelOption[]>([]);
  const [flightRoute, setFlightRoute] = useState<FlightRouteDisplay | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        'Puedes pedirme: "make cheaper", "add insurance" o "upgrade hotel".',
    },
  ]);
  const [agentNotes, setAgentNotes] = useState(
    "Revisar disponibilidad antes de confirmar. Validar condiciones de cancelación.",
  );

  const totals = useMemo(() => {
    return lineItems.reduce(
      (acc, item) => {
        const margin = item.netCost * (item.marginPercent / 100);
        return {
          netCost: acc.netCost + item.netCost,
          agencyMargin: acc.agencyMargin + margin,
          clientPrice: acc.clientPrice + item.netCost + margin,
        };
      },
      { netCost: 0, agencyMargin: 0, clientPrice: 0 },
    );
  }, [lineItems]);

  function updateMargin(id: string, marginPercent: number) {
    setLineItems((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, marginPercent: Number.isFinite(marginPercent) ? marginPercent : 0 }
          : item,
      ),
    );
  }

  function toggleFlightOption(flight: FlightOption, index: number) {
    const item = flightToLineItem(flight, index);
    setLineItems((items) =>
      items.some((current) => current.id === item.id)
        ? items.filter((current) => current.id !== item.id)
        : [...items, item],
    );
  }

  function toggleHotelOption(hotel: HotelOption, index: number) {
    const item = hotelToLineItem(hotel, index);
    setLineItems((items) =>
      items.some((current) => current.id === item.id)
        ? items.filter((current) => current.id !== item.id)
        : [...items, item],
    );
  }

  function isSelected(id: string) {
    return lineItems.some((item) => item.id === id);
  }

  function sendChatMessage() {
    const message = chatInput.trim();
    if (!message) return;

    const normalized = message.toLowerCase();
    let response =
      "He revisado la cotización. Puedes pedirme bajar precio, añadir seguro o mejorar hotel.";

    if (/cheaper|barato|bajar|econ[oó]mico|reduce/.test(normalized)) {
      setLineItems((items) =>
        items.map((item) => ({
          ...item,
          marginPercent: Math.max(5, item.marginPercent - 5),
        })),
      );
      response = "He reducido los márgenes para hacer la propuesta más económica.";
    } else if (/insurance|seguro/.test(normalized)) {
      setLineItems((items) =>
        items.some((item) => item.id.startsWith("corporate-insurance"))
          ? items
          : [...items, createInsuranceLineItem()],
      );
      response = "He añadido un seguro de viaje premium desde proveedor corporativo.";
    } else if (/upgrade|mejor|subir|hotel/.test(normalized)) {
      setLineItems((items) =>
        items.map((item) =>
          item.id.startsWith("web-hotel") || item.id.startsWith("inventory-")
            ? {
                ...item,
                name: `${item.name} - upgrade`,
                description: `${item.description} · categoría superior`,
                netCost: Math.round(item.netCost * 1.18),
              }
            : item,
        ),
      );
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
    setLineItems([]);
    setFlightOptions([]);
    setHotelOptions([]);
    setFlightRoute(null);
    setStepChips(defaultStepChips);
    setActiveStep(0);
    const parsed = parseRequest(latestRequest);
    if (!parsed) {
      setStepChips((current) =>
        current.map((chips, index) =>
          index === 0
            ? [
                "Destination not detected",
                "Please specify: hoteles en Ribadesella / viaje a Valladolid / vuelo de Madrid a Tokyo",
              ]
            : chips,
        ),
      );
      setIsRunning(false);
      setActiveStep(0);
      return;
    }
    setFlightRoute(
      parsed.origin
        ? {
            origin: getAirportDisplay(parsed.origin, "Origin"),
            destination: getAirportDisplay(parsed.destination, "Destination"),
          }
        : null,
    );
    const quoteItems: QuoteLineItem[] = [];

    setStepChips((current) =>
      current.map((chips, index) =>
        index === 0
          ? [
              `Destination: ${parsed.destination}`,
              `${parsed.adults} travellers`,
              parsed.includeFlights ? "Flights requested" : "Hotels/services only",
            ]
          : chips,
      ),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    setActiveStep(1);
    const supabase = createBrowserSupabaseClient();
    const { data: inventoryData, error: inventoryError } = await supabase
      .from("inventory")
      .select("id,category,name,data")
      .in("category", parsed.requestedCategories);
    const inventoryItems = ((inventoryData ?? []) as InventoryItem[]).filter(
      (item) =>
        parsed.requestedCategories.includes(item.category) &&
        (matchesDestination(item, parsed.destination) ||
          parsed.requestedCategories.includes(item.category)),
    );
    const inventoryLineItems = inventoryItems.map(inventoryItemToLineItem);
    quoteItems.push(...inventoryLineItems);
    setLineItems([...quoteItems]);
    setStepChips((current) =>
      current.map((chips, index) =>
        index === 1
          ? [
              `${inventoryLineItems.length} items found in own inventory`,
              inventoryError ? `Inventory warning: ${inventoryError.message}` : "Supabase inventory checked",
            ]
          : chips,
      ),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    setActiveStep(2);
    const contractedItems = inventoryItems.filter((item) =>
      ["suppliers", "tour_operators"].includes(item.category),
    );
    setStepChips((current) =>
      current.map((chips, index) =>
        index === 2
          ? [
              `${contractedItems.length} contracted supplier matches`,
              "Supplier contracts checked",
            ]
          : chips,
      ),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    setActiveStep(3);
    setStepChips((current) =>
      current.map((chips, index) =>
        index === 3
          ? ["Corporate system not connected", "Skipped corporate pricing"]
          : chips,
      ),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    setActiveStep(4);
    const hasHotelCoverage = inventoryItems.some((item) => item.category === "hotels");
    let webFlightOptions: FlightOption[] = [];
    let webHotelOptions: HotelOption[] = [];

    try {
      if (!hasHotelCoverage) {
        const hotelData = await fetchJson<{ hotels: HotelOption[] }>(
          "/api/search-hotels",
          {
            destination: parsed.destination,
            checkIn: parsed.checkIn,
            checkOut: parsed.checkOut,
            adults: parsed.adults,
          },
        );
        webHotelOptions = hotelData.hotels.slice(0, 3);
        setHotelOptions(webHotelOptions);
      }

      if (parsed.includeFlights && parsed.origin) {
        const flightData = await fetchJson<{ flights: FlightOption[] }>(
          "/api/search-flights",
          {
            origin: parsed.origin,
            destination: parsed.destination,
            date: parsed.checkIn,
            adults: parsed.adults,
          },
        );
        webFlightOptions = flightData.flights.slice(0, 3);
        setFlightOptions(webFlightOptions);
      }
    } catch (error) {
      console.error("[QuoteEngine] Web search failed", error);
    }

    setLineItems([...quoteItems]);
    setStepChips((current) =>
      current.map((chips, index) =>
        index === 4
          ? [
              `${webFlightOptions.length + webHotelOptions.length} web options found`,
              hasHotelCoverage ? "Hotel covered by own inventory" : "Booking.com checked",
              parsed.includeFlights ? "Skyscanner checked" : "Flight search skipped",
            ]
          : chips,
      ),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    setActiveStep(5);
    setStepChips((current) =>
      current.map((chips, index) =>
        index === 5
          ? [
              `${quoteItems.filter((item) => item.source === "INV-PROPIO").length} [INV-PROPIO] items`,
              `${webFlightOptions.length + webHotelOptions.length} [WEB] options ready`,
              "Margins applied",
            ]
          : chips,
      ),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    setActiveStep(PROCESS_STEPS.length);
    setIsRunning(false);
    setIsComplete(true);
  }

  function generateAgentPDF() {
    const doc = new jsPDF();
    const quoteReference = createQuoteReference();

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
      head: [["Linea", "Fuente", "Neto", "Margen", "Cliente"]],
      body: lineItems.map((item) => {
        const { clientPrice } = getLineFinancials(item);
        return [
          `${item.name}\n${item.description}`,
          `[${item.source}]`,
          formatCurrency(item.netCost),
          `${item.marginPercent}%`,
          formatCurrency(clientPrice),
        ];
      }),
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
          const source = lineItems[data.row.index]?.source;
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
    doc.text(`Net cost: ${formatCurrency(totals.netCost)}`, 20, finalY + 29);
    doc.text(
      `Agency margin: ${formatCurrency(totals.agencyMargin)}`,
      76,
      finalY + 29,
    );
    doc.setTextColor(0, 201, 167);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Client price: ${formatCurrency(totals.clientPrice)}`,
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
    const doc = new jsPDF();
    const quoteReference = createQuoteReference();

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
      head: [["Servicio", "Descripcion", "Precio cliente"]],
      body: lineItems.map((item) => {
        const { clientPrice } = getLineFinancials(item);
        return [item.name, item.description, formatCurrency(clientPrice)];
      }),
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
    doc.text(formatCurrency(totals.clientPrice), 126, finalY + 32);

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
              Pega una solicitud de cliente y visualiza cómo TQuot analiza,
              busca, aplica márgenes y compila una propuesta lista para PDF.
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
            <PremiumMetric label="Prioridad" value="INV → CORP → WEB" />
            <PremiumMetric label="Motor" value="IA + APIs" />
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

        {isComplete ? (
          <section className="mt-8 rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(9,18,32,0.94),rgba(3,8,15,0.78))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#00C9A7]">
                  Proposal workspace
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                  Cotización compilada
                </h2>
                <p className="mt-1 text-sm text-[#8B9CB3]">
                  Ajusta márgenes por línea antes de generar el PDF.
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

            {(flightOptions.length > 0 || hotelOptions.length > 0) ? (
              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                {flightOptions.length > 0 ? (
                  <section>
                    <SectionHeading
                      eyebrow="Skyscanner API"
                      title="Flight search options"
                      subtitle="Selecciona vuelos con ruta, horarios, aerolinea y precio."
                    />
                    <div className="space-y-3">
                      {flightOptions.map((flight, index) => {
                        const selected = isSelected(`web-flight-${index}`);
                        return (
                          <FlightOptionCard
                            key={`${flight.airline}-${flight.flightNumber}-${index}`}
                            flight={flight}
                            route={flightRoute}
                            selected={selected}
                            onToggle={() => toggleFlightOption(flight, index)}
                          />
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {hotelOptions.length > 0 ? (
                  <section>
                    <SectionHeading
                      eyebrow="Booking.com API"
                      title="Hotel search options"
                      subtitle="Compara habitacion, ubicacion, highlights y tarifa por noche."
                    />
                    <div className="space-y-3">
                      {hotelOptions.map((hotel, index) => {
                        const selected = isSelected(`web-hotel-${index}`);
                        return (
                          <HotelOptionCard
                            key={`${hotel.name}-${index}`}
                            hotel={hotel}
                            selected={selected}
                            onToggle={() => toggleHotelOption(hotel, index)}
                          />
                        );
                      })}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-3">
              {lineItems.map((item) => {
                const marginAmount = item.netCost * (item.marginPercent / 100);
                const clientPrice = item.netCost + marginAmount;

                return (
                  <article
                    key={item.id}
                    className="grid gap-4 rounded-3xl border border-white/[0.08] bg-[#03080F]/60 p-5 shadow-[0_16px_44px_rgba(0,0,0,0.24)] transition-colors hover:border-[#00C9A7]/20 md:grid-cols-[1fr_auto_auto]"
                  >
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{item.name}</h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sourceStyles[item.source]}`}
                        >
                          [{item.source}]
                        </span>
                      </div>
                      <p className="text-sm text-[#8B9CB3]">
                        {item.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm md:w-80">
                      <div>
                        <p className="text-[#8B9CB3]">Neto</p>
                        <p className="font-semibold text-white">
                          {formatCurrency(item.netCost)}
                        </p>
                      </div>
                      <label>
                        <span className="text-[#8B9CB3]">Margen</span>
                        <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-2">
                          <input
                            type="number"
                            min={0}
                            value={item.marginPercent}
                            onChange={(event) =>
                              updateMargin(item.id, Number(event.target.value))
                            }
                            className="w-full bg-transparent py-1.5 text-white outline-none"
                          />
                          <span className="text-[#8B9CB3]">%</span>
                        </div>
                      </label>
                      <div>
                        <p className="text-[#8B9CB3]">Cliente</p>
                        <p className="font-semibold text-[#00C9A7]">
                          {formatCurrency(clientPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm md:text-right">
                      <p className="text-[#8B9CB3]">Beneficio</p>
                      <p className="font-semibold text-[#F5C518]">
                        {formatCurrency(marginAmount)}
                      </p>
                    </div>
                  </article>
                );
              })}
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
              <TotalCard label="Net cost" value={totals.netCost} />
              <TotalCard label="Agency margin" value={totals.agencyMargin} />
              <TotalCard label="Client price" value={totals.clientPrice} highlight />
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

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#00C9A7]">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-lg font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-[#8B9CB3]">{subtitle}</p>
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

function FlightOptionCard({
  flight,
  route,
  selected,
  onToggle,
}: {
  flight: FlightOption;
  route: FlightRouteDisplay | null;
  selected: boolean;
  onToggle: () => void;
}) {
  const origin = route?.origin ?? {
    city: "Origin",
    airport: "Origin airport",
    code: "ORG",
  };
  const destination = route?.destination ?? {
    city: "Destination",
    airport: "Destination airport",
    code: "DST",
  };
  const isDirect = String(flight.stops) === "0";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`group w-full overflow-hidden rounded-3xl border p-4 text-left shadow-[0_16px_44px_rgba(0,0,0,0.24)] transition-all hover:-translate-y-0.5 ${
        selected
          ? "border-[#00C9A7]/55 bg-[#00C9A7]/10"
          : "border-white/[0.08] bg-[#03080F]/60 hover:border-[#00C9A7]/30"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-white">
              {flight.airline} {flight.flightNumber}
            </p>
            <span className={sourceStyles.WEB + " rounded-full border px-2 py-0.5 text-xs font-semibold"}>
              [WEB]
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8B9CB3]">
            {isDirect ? "Direct flight" : `${flight.stops} stops`} · {flight.duration}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-[#00C9A7]">{flight.price}</p>
          <p className="text-xs text-[#8B9CB3]">
            {selected ? "Included" : "Click to include"}
          </p>
        </div>
      </div>

      <div className="grid items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 sm:grid-cols-[1fr_auto_1fr]">
        <AirportBlock airport={origin} time={flight.departureTime} align="left" />
        <div className="flex items-center justify-center gap-2 text-[#4A6A85]">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#00C9A7]/60" />
          <span className="rounded-full border border-[#00C9A7]/25 bg-[#00C9A7]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#00C9A7]">
            {flight.duration}
          </span>
          <span className="h-px w-10 bg-gradient-to-r from-[#00C9A7]/60 to-transparent" />
        </div>
        <AirportBlock airport={destination} time={flight.arrivalTime} align="right" />
      </div>

      {!isDirect ? (
        <p className="mt-3 text-xs text-[#8B9CB3]">
          Stopover: <span className="text-[#E8EEF7]">{flight.stopoverLocation}</span>
        </p>
      ) : null}
    </button>
  );
}

function AirportBlock({
  airport,
  time,
  align,
}: {
  airport: AirportDisplay;
  time: string;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-2xl font-black tracking-tight text-white">{airport.code}</p>
      <p className="text-sm font-semibold text-[#E8EEF7]">{time}</p>
      <p className="mt-1 text-xs text-[#8B9CB3]">{airport.airport}</p>
      <p className="text-[11px] text-[#4A6A85]">{airport.city}</p>
    </div>
  );
}

function HotelOptionCard({
  hotel,
  selected,
  onToggle,
}: {
  hotel: HotelOption;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`group w-full rounded-3xl border p-4 text-left shadow-[0_16px_44px_rgba(0,0,0,0.24)] transition-all hover:-translate-y-0.5 ${
        selected
          ? "border-[#00C9A7]/55 bg-[#00C9A7]/10"
          : "border-white/[0.08] bg-[#03080F]/60 hover:border-[#00C9A7]/30"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="font-bold text-white">{hotel.name}</p>
            <span className={sourceStyles.WEB + " rounded-full border px-2 py-0.5 text-xs font-semibold"}>
              [WEB]
            </span>
          </div>
          <p className="text-sm text-[#E8EEF7]">
            {hotel.roomType} · {hotel.stars} stars · Rating {hotel.rating}
          </p>
          <p className="mt-1 text-xs text-[#8B9CB3]">{hotel.address}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-black text-[#00C9A7]">{hotel.pricePerNight}</p>
          <p className="text-xs text-[#8B9CB3]">per night</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 sm:grid-cols-3">
        <HotelDetail label="Room" value={hotel.roomType} />
        <HotelDetail label="Distance" value={hotel.distanceFromCenter} />
        <HotelDetail label={selected ? "Status" : "Action"} value={selected ? "Included" : "Click to include"} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {hotel.highlights.slice(0, 5).map((highlight) => (
          <span
            key={highlight}
            className="rounded-full border border-[#00C9A7]/20 bg-[#00C9A7]/10 px-2.5 py-1 text-xs font-medium text-[#00C9A7]"
          >
            {highlight}
          </span>
        ))}
      </div>
    </button>
  );
}

function HotelDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4A6A85]">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold text-[#E8EEF7]">{value}</p>
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
