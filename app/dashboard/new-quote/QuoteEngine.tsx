"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Link from "next/link";
import { useMemo, useState } from "react";
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

const DEFAULT_ITEMS: QuoteLineItem[] = [
  {
    id: "hotel",
    name: "Hotel boutique 4* - 3 noches",
    description: "Habitación doble con desayuno incluido",
    source: "INV-PROPIO",
    netCost: 420,
    marginPercent: 18,
  },
  {
    id: "experience",
    name: "Experiencia privada en destino",
    description: "Tour local con proveedor contratado",
    source: "CORPORATIVO",
    netCost: 180,
    marginPercent: 15,
  },
  {
    id: "flight",
    name: "Vuelos ida y vuelta",
    description: "Mejor combinación encontrada en búsqueda web",
    source: "WEB",
    netCost: 365,
    marginPercent: 10,
  },
  {
    id: "transfer",
    name: "Traslados aeropuerto - hotel",
    description: "Servicio privado con asistencia",
    source: "INV-PROPIO",
    netCost: 95,
    marginPercent: 20,
  },
];

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

  if (profile.logoBase64) {
    try {
      doc.addImage(profile.logoBase64, "PNG", logoX, logoY, logoSize, logoSize);
    } catch {
      try {
        doc.addImage(profile.logoBase64, "JPEG", logoX, logoY, logoSize, logoSize);
      } catch {
        doc.setFillColor(isDark ? 0 : 3, isDark ? 201 : 8, isDark ? 167 : 15);
        doc.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, "F");
        doc.setTextColor(isDark ? 3 : 0, isDark ? 8 : 201, isDark ? 15 : 167);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("LOGO", logoX + 7, logoY + 14);
      }
    }
  } else {
    doc.setFillColor(isDark ? 0 : 3, isDark ? 201 : 8, isDark ? 167 : 15);
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, "F");
    doc.setTextColor(isDark ? 3 : 0, isDark ? 8 : 201, isDark ? 15 : 167);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("LOGO", logoX + 7, logoY + 14);
  }

  doc.setTextColor(isDark ? 255 : 3, isDark ? 255 : 8, isDark ? 255 : 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(profile.agencyName || "Travel Agency", 44, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(isDark ? 139 : 100, isDark ? 156 : 116, isDark ? 179 : 139);
  const contactLines = [
    profile.email,
    profile.phone,
    profile.address,
    profile.website,
  ].filter(Boolean);
  doc.text(contactLines.slice(0, 3), 44, 27);
  doc.text(`Ref: ${quoteReference}`, 150, 20);
}

export function QuoteEngine() {
  const { locale, setLocale, t } = useDashboardLanguage();
  const [request, setRequest] = useState(
    "Necesito un viaje para 2 adultos a Ribadesella, 3 noches, hotel con encanto, vuelos desde Madrid y una experiencia local.",
  );
  const [activeStep, setActiveStep] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [lineItems, setLineItems] = useState(DEFAULT_ITEMS);

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

  async function runQuoteEngine() {
    setIsRunning(true);
    setIsComplete(false);
    setActiveStep(0);

    for (let index = 0; index < PROCESS_STEPS.length; index += 1) {
      setActiveStep(index);
      await new Promise((resolve) => window.setTimeout(resolve, 900));
    }

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
    doc.text(
      [
        "- Revisar disponibilidad final antes de enviar al cliente.",
        "- Validar condiciones de cancelacion con cada proveedor.",
        "- Confirmar margen minimo antes de cerrar reserva.",
      ],
      14,
      finalY + 63,
    );

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
    <div className="relative min-h-screen bg-[#03080F] px-6 py-10 text-[#E8EEF7]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(0,201,167,0.12),transparent)]"
        aria-hidden
      />

      <main className="relative mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center text-sm text-[#8B9CB3] transition-colors hover:text-[#00C9A7]"
        >
          ← {t.backToDashboard}
        </Link>

        <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00C9A7]">
              TQuot AI Engine
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t.newQuote}
            </h1>
            <p className="mt-3 max-w-2xl text-[#8B9CB3]">
              Pega una solicitud de cliente y visualiza cómo TQuot analiza,
              busca, aplica márgenes y compila una propuesta lista para PDF.
            </p>
          </div>
          <div className="flex w-fit rounded-full border border-white/10 bg-white/[0.04] p-0.5">
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
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
            <label
              htmlFor="client-request"
              className="mb-3 block text-sm font-medium text-[#E8EEF7]"
            >
              {t.clientRequestLabel}
            </label>
            <textarea
              id="client-request"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              rows={10}
              className="w-full resize-y rounded-xl border border-white/10 bg-[#03080F]/60 px-4 py-3 text-[#E8EEF7] placeholder:text-[#8B9CB3]/50 outline-none transition-colors focus:border-[#00C9A7]/50 focus:ring-2 focus:ring-[#00C9A7]/20"
              placeholder="Ej: 2 adultos a Ribadesella, 3 noches, hotel boutique, vuelos desde Madrid..."
            />

            <button
              type="button"
              onClick={runQuoteEngine}
              disabled={!request.trim() || isRunning}
              className="mt-6 w-full rounded-xl bg-[#00C9A7] px-8 py-3 text-sm font-semibold text-[#03080F] shadow-[0_0_32px_-8px_rgba(0,201,167,0.5)] transition-all hover:bg-[#00E5BB] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? "Procesando..." : t.generateQuote}
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
            <h2 className="mb-5 text-lg font-semibold text-white">
              Proceso IA paso a paso
            </h2>
            <div className="space-y-4">
              {PROCESS_STEPS.map((step, index) => {
                const status = getStepStatus(index, activeStep, isRunning);
                return (
                  <div
                    key={step.title}
                    className={`rounded-2xl border p-4 transition-colors ${
                      status === "active"
                        ? "border-[#00C9A7]/40 bg-[#00C9A7]/10"
                        : status === "done"
                          ? "border-emerald-400/25 bg-emerald-400/5"
                          : "border-white/[0.06] bg-[#03080F]/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <StepIndicator status={status} />
                      <p className="font-medium text-white">{step.title}</p>
                    </div>
                    {status !== "pending" ? (
                      <div className="mt-3 flex flex-wrap gap-2 pl-9">
                        {step.chips.map((chip) => (
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
              })}
            </div>
          </div>
        </section>

        {isComplete ? (
          <section className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-bold text-white">
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
                  className="rounded-xl border border-[#00C9A7]/30 bg-[#00C9A7]/10 px-5 py-2.5 text-sm font-semibold text-[#00C9A7] transition-colors hover:bg-[#00C9A7]/15"
                >
                  PDF Agente
                </button>
                <button
                  type="button"
                  onClick={generateClientPDF}
                  className="rounded-xl bg-[#00C9A7] px-5 py-2.5 text-sm font-semibold text-[#03080F] transition-colors hover:bg-[#00E5BB]"
                >
                  PDF Cliente
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {lineItems.map((item) => {
                const marginAmount = item.netCost * (item.marginPercent / 100);
                const clientPrice = item.netCost + marginAmount;

                return (
                  <article
                    key={item.id}
                    className="grid gap-4 rounded-2xl border border-white/[0.06] bg-[#03080F]/50 p-5 md:grid-cols-[1fr_auto_auto]"
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
                        <div className="mt-1 flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-2">
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

            <div className="mt-6 grid gap-4 rounded-2xl border border-[#00C9A7]/20 bg-[#00C9A7]/10 p-5 sm:grid-cols-3">
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

function StepIndicator({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-[#03080F]">
        ✓
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="h-6 w-6 rounded-full border-2 border-[#00C9A7] border-t-transparent animate-spin" />
    );
  }

  return <span className="h-6 w-6 rounded-full border border-white/15" />;
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
