import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  pricedQuoteItemsFromQuote,
  type Quote,
  type QuoteItemSource,
} from "@/lib/quotes/build-quote";
import { computeMICECost } from "@/lib/quote-engine/group/mice-defaults";
import type { QuoteGroup } from "@/lib/quote-engine/types";
import { readAgencyProfile } from "../agency/agency-profile";
import type { DashboardTranslation } from "../translations";
import type { Locale } from "../translations";
import { formatMessage } from "../format-message";
import { formatCurrency } from "./quote-shared";

const sourcePdfColors: Record<QuoteItemSource, [number, number, number]> = {
  mock: [148, 163, 184],
  inventory: [0, 201, 167],
  api: [168, 85, 247],
};

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

export function openServerPdf(quoteId: string, variant: "agent" | "client") {
  window.open(
    `/api/quotes/${quoteId}/pdf?variant=${variant}`,
    "_blank",
    "noopener,noreferrer",
  );
}

export function generateAgentPDF(params: {
  quote: Quote;
  locale: Locale;
  t: DashboardTranslation;
  agentNotes: string;
}) {
  const { quote, locale, t, agentNotes } = params;
  const doc = new jsPDF();
  const quoteReference = quote.id;
  const items = pricedQuoteItemsFromQuote(quote);

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

  const quoteWithGroup = quote as Quote & { group?: QuoteGroup };
  if (quoteWithGroup.group?.distribution) {
    const { distribution, totalPax, isCorporate, mice } = quoteWithGroup.group;
    const miceCost = mice ? computeMICECost(mice) : 0;
    const groupTotalEstimated = quote.pricing.finalTotal + miceCost;

    doc.setFontSize(9);
    doc.setTextColor(139, 156, 179);
    doc.text(
      `Grupo: ${totalPax ?? quote.summary.passengers.total} pax · ${distribution.totalRooms} habitaciones (${distribution.doubles} dobles, ${distribution.singles} individuales, ${distribution.triples} triples)`,
      14,
      74,
      { maxWidth: 182 },
    );
    doc.text(
      `MICE: ${isCorporate ? "sí" : "no"} · Est. MICE: ${formatCurrency(miceCost, locale)} · Total grupo est.: ${formatCurrency(groupTotalEstimated, locale)}`,
      14,
      80,
      { maxWidth: 182 },
    );
  }

  autoTable(doc, {
    startY: quoteWithGroup.group?.distribution ? 92 : 80,
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
    alternateRowStyles: { fillColor: [12, 24, 39] },
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

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 140;

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
  doc.text(agentNotes || t.pdfNoNotes, 14, finalY + 63, { maxWidth: 180 });

  doc.save(formatMessage(t.pdfFilenameAgent, { ref: quoteReference }));
}

export function generateClientPDF(params: {
  quote: Quote;
  locale: Locale;
  t: DashboardTranslation;
}) {
  const { quote, locale, t } = params;
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

  const quoteWithGroup = quote as Quote & { group?: QuoteGroup };
  if (quoteWithGroup.group?.distribution) {
    const { distribution, totalPax, mice } = quoteWithGroup.group;
    const miceCost = mice ? computeMICECost(mice) : 0;
    const groupTotalEstimated = quote.pricing.finalTotal + miceCost;

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Grupo: ${totalPax ?? quote.summary.passengers.total} pax · ${distribution.totalRooms} habitaciones (${distribution.doubles} dobles, ${distribution.singles} individuales, ${distribution.triples} triples)`,
      14,
      73,
      { maxWidth: 182 },
    );
    doc.text(
      `Est. MICE: ${formatCurrency(miceCost, locale)} · Total grupo est.: ${formatCurrency(groupTotalEstimated, locale)}`,
      14,
      78,
      { maxWidth: 182 },
    );
  }

  autoTable(doc, {
    startY: quoteWithGroup.group?.distribution ? 88 : 82,
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
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      2: {
        halign: "right",
        textColor: [0, 145, 122],
        fontStyle: "bold",
      },
    },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 130;

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
