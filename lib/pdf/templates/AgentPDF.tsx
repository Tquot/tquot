/**
 * ─────────────────────────────────────────────────────────────
 *  PDF AGENTE — Cotización interna confidencial
 * ─────────────────────────────────────────────────────────────
 *
 *  Diseño funcional, denso, claro.
 *  Fondo crema (paper) — no oscuro como el cliente. La idea es que el agente
 *  imprima, anote, archive. Fondo oscuro pesaría en tinta y dificultaría la lectura
 *  rápida de números.
 *
 *  Incluye:
 *  - Cabecera "COTIZACIÓN INTERNA — CONFIDENCIAL" con tira de aviso
 *  - Desglose línea a línea con: neto, margen, margen %, PVP
 *  - Marcadores de fuente [INV-PROPIO] [CORPORATIVO] [WEB]
 *  - Notas internas por línea
 *  - Notas del agente al pie
 *  - Totales con margen agregado destacado
 */

import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fonts, fontSize, fontWeight, spacing, page } from "../theme";
import { AgencyLogo } from "../components/AgencyLogo";
import { RecommendationsBlock } from "../components/RecommendationsBlock";
import { PDFHotelContentBlock } from "../components/PDFHotelContentBlock";
import { SectionLabel } from "../components/Decoration";
import { SourceBadge } from "../components/SourceBadge";
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatPercent,
  formatPaxCount,
} from "../utils/format";
import type { Quote } from "../types";

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.paper,
    paddingTop: page.agent.paddingTop,
    paddingBottom: page.agent.paddingBottom,
    paddingHorizontal: page.agent.paddingX,
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    color: colors.textOnLight,
  },

  // ──── Cabecera confidencial
  confidentialBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.ink,
    paddingVertical: 6,
    paddingHorizontal: page.agent.paddingX,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidentialText: {
    fontFamily: fonts.body,
    fontSize: fontSize.micro,
    color: colors.gold,
    letterSpacing: 2,
    fontWeight: fontWeight.semibold,
  },
  confidentialMeta: {
    fontFamily: fonts.body,
    fontSize: fontSize.micro,
    color: colors.textOnDarkMuted,
    letterSpacing: 0.5,
  },

  // ──── Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: "flex-end" },

  title: {
    fontFamily: fonts.display,
    fontSize: fontSize.h2,
    fontWeight: fontWeight.semibold,
    color: colors.textOnLight,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSize.small,
    color: colors.textOnLightMuted,
    marginTop: 2,
  },
  reference: {
    fontFamily: fonts.mono,
    fontSize: fontSize.tiny,
    color: colors.textOnLightMuted,
    letterSpacing: 1,
  },
  agencyName: {
    fontFamily: fonts.body,
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    color: colors.textOnLightMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.xs,
  },

  // ──── Bloque de info
  infoBlock: {
    backgroundColor: colors.paperSoft,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  infoLabel: {
    width: 110,
    fontSize: fontSize.tiny,
    color: colors.textOnLightMuted,
    fontWeight: fontWeight.medium,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoValue: {
    flex: 1,
    fontSize: fontSize.small,
    color: colors.textOnLight,
  },

  // ──── Tabla de líneas
  lineItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.textOnLightMuted,
    borderBottomStyle: "solid",
  },
  lineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  lineHeaderLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  lineCategoryBadge: {
    backgroundColor: colors.ink,
    color: colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: fontSize.micro,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginRight: spacing.sm,
  },
  lineDescription: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.textOnLight,
    flex: 1,
  },
  lineSubtitle: {
    fontSize: fontSize.small,
    color: colors.textOnLightMuted,
    marginTop: 2,
    marginLeft: 56,
  },

  // ──── Desglose de coste por línea
  costGrid: {
    flexDirection: "row",
    marginTop: spacing.sm,
    marginLeft: 56,
    gap: spacing.lg,
  },
  costCell: {
    flexDirection: "column",
  },
  costLabel: {
    fontSize: fontSize.micro,
    color: colors.textOnLightMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  costValue: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.textOnLight,
    fontFamily: fonts.mono,
  },
  costValuePublic: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.gold,
    fontFamily: fonts.mono,
  },

  internalNote: {
    marginTop: spacing.sm,
    marginLeft: 56,
    padding: spacing.sm,
    backgroundColor: "#FFF8E7",
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    borderLeftStyle: "solid",
  },
  internalNoteLabel: {
    fontSize: fontSize.micro,
    color: colors.gold,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  internalNoteText: {
    fontSize: fontSize.small,
    color: colors.textOnLight,
    lineHeight: 1.4,
  },

  // ──── Totales
  totalsBlock: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.ink,
    color: colors.textOnDark,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  totalsLabel: {
    fontSize: fontSize.small,
    color: colors.textOnDarkMuted,
    letterSpacing: 0.5,
  },
  totalsValue: {
    fontSize: fontSize.body,
    color: colors.textOnDark,
    fontFamily: fonts.mono,
    fontWeight: fontWeight.semibold,
  },
  totalsBigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.gold,
    borderTopStyle: "solid",
  },
  totalsBigLabel: {
    fontSize: fontSize.tiny,
    color: colors.gold,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: fontWeight.semibold,
  },
  totalsBigValue: {
    fontFamily: fonts.display,
    fontSize: fontSize.h2,
    color: colors.gold,
    fontWeight: fontWeight.semibold,
  },

  // ──── Notas
  notesBlock: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.paperSoft,
  },
  notesText: {
    fontSize: fontSize.small,
    color: colors.textOnLight,
    lineHeight: 1.5,
  },

  // ──── Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: page.agent.paddingX,
    right: page.agent.paddingX,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.textOnLightMuted,
    borderTopStyle: "solid",
  },
  footerText: {
    fontSize: fontSize.micro,
    color: colors.textOnLightMuted,
    letterSpacing: 0.5,
  },

  // ──── Leyenda fuentes
  legendBlock: {
    marginTop: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

interface AgentPDFProps {
  quote: Quote;
}

export function AgentPDF({ quote }: AgentPDFProps) {
  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      flight: "VUELO",
      hotel: "HOTEL",
      transfer: "TRASLADO",
      activity: "ACTIVIDAD",
      insurance: "SEGURO",
      other: "OTRO",
    };
    return map[cat] ?? cat.toUpperCase();
  };

  return (
    <Document
      title={`Cotización interna ${quote.reference}`}
      author={quote.agency.name}
      subject="Cotización interna — confidencial"
    >
      <Page size="A4" style={styles.page}>
        {/* Tira de confidencialidad */}
        <View style={styles.confidentialBar} fixed>
          <Text style={styles.confidentialText}>
            COTIZACIÓN INTERNA · CONFIDENCIAL
          </Text>
          <Text style={styles.confidentialMeta}>
            {quote.reference} · {formatDate(quote.createdAt)}
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AgencyLogo agency={quote.agency} variant="light" maxWidth={120} maxHeight={50} />
            <Text style={styles.title}>Desglose de cotización</Text>
            <Text style={styles.subtitle}>
              Agente: {quote.agent.name} · {quote.agent.email}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reference}>REF · {quote.reference}</Text>
            <Text style={styles.agencyName}>{quote.agency.name}</Text>
            <Text style={[styles.subtitle, { textAlign: "right" }]}>
              Válida hasta {formatDate(quote.validUntil)}
            </Text>
          </View>
        </View>

        {/* Info del viaje y cliente */}
        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cliente</Text>
            <Text style={styles.infoValue}>
              {quote.client.fullName}
              {quote.client.reference ? `  ·  Ref: ${quote.client.reference}` : ""}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trayecto</Text>
            <Text style={styles.infoValue}>
              {quote.trip.origin} → {quote.trip.destination}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fechas</Text>
            <Text style={styles.infoValue}>
              {formatDateRange(quote.trip.departureDate, quote.trip.returnDate)}
              {"  ·  "}
              {quote.trip.nights} {quote.trip.nights === 1 ? "noche" : "noches"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pasajeros</Text>
            <Text style={styles.infoValue}>
              {formatPaxCount(quote.trip.adults, quote.trip.children, quote.trip.infants)}
            </Text>
          </View>
          {quote.trip.purpose && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Motivo</Text>
              <Text style={styles.infoValue}>{quote.trip.purpose}</Text>
            </View>
          )}
        </View>

        {/* Líneas de coste */}
        <SectionLabel variant="light">Desglose por línea</SectionLabel>

        {quote.lineItems.map((item) => (
          <View key={item.id}>
            <View style={styles.lineItem} wrap={false}>
              <View style={styles.lineHeader}>
                <View style={styles.lineHeaderLeft}>
                  <Text style={styles.lineCategoryBadge}>{categoryLabel(item.category)}</Text>
                  <Text style={styles.lineDescription}>{item.description}</Text>
                </View>
                <SourceBadge source={item.source} />
              </View>

              {item.subtitle && <Text style={styles.lineSubtitle}>{item.subtitle}</Text>}

              {/* Desglose económico */}
              <View style={styles.costGrid}>
                <View style={styles.costCell}>
                  <Text style={styles.costLabel}>Coste neto</Text>
                  <Text style={styles.costValue}>
                    {formatCurrency(item.netCost, quote.totals.currency)}
                  </Text>
                </View>
                <View style={styles.costCell}>
                  <Text style={styles.costLabel}>Margen</Text>
                  <Text style={styles.costValue}>
                    {formatCurrency(item.margin, quote.totals.currency)}
                  </Text>
                </View>
                <View style={styles.costCell}>
                  <Text style={styles.costLabel}>Margen %</Text>
                  <Text style={styles.costValue}>{formatPercent(item.marginPercent)}</Text>
                </View>
                <View style={styles.costCell}>
                  <Text style={styles.costLabel}>PVP</Text>
                  <Text style={styles.costValuePublic}>
                    {formatCurrency(item.publicPrice, quote.totals.currency)}
                  </Text>
                </View>
                {item.supplier && (
                  <View style={styles.costCell}>
                    <Text style={styles.costLabel}>Proveedor</Text>
                    <Text style={styles.costValue}>{item.supplier}</Text>
                  </View>
                )}
              </View>

              {/* Nota interna por línea */}
              {item.internalNotes && (
                <View style={styles.internalNote}>
                  <Text style={styles.internalNoteLabel}>Nota interna</Text>
                  <Text style={styles.internalNoteText}>{item.internalNotes}</Text>
                </View>
              )}
            </View>
            {item.category === "hotel" && item.hotelContent ? (
              <PDFHotelContentBlock content={item.hotelContent} />
            ) : null}
          </View>
        ))}

        {/* Totales */}
        <View style={styles.totalsBlock} wrap={false}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Coste neto total</Text>
            <Text style={styles.totalsValue}>
              {formatCurrency(quote.totals.netCost, quote.totals.currency)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Margen total</Text>
            <Text style={styles.totalsValue}>
              {formatCurrency(quote.totals.margin, quote.totals.currency)}
              {"  "}
              <Text style={{ color: colors.gold }}>
                ({formatPercent(quote.totals.marginPercent)})
              </Text>
            </Text>
          </View>
          <View style={styles.totalsBigRow}>
            <Text style={styles.totalsBigLabel}>PVP final al cliente</Text>
            <Text style={styles.totalsBigValue}>
              {formatCurrency(quote.totals.publicPrice, quote.totals.currency)}
            </Text>
          </View>
        </View>

        {/* Notas del agente */}
        {quote.agentNotes && (
          <View style={styles.notesBlock} wrap={false}>
            <SectionLabel variant="light">Notas internas del agente</SectionLabel>
            <Text style={styles.notesText}>{quote.agentNotes}</Text>
          </View>
        )}

        {quote.recommendations && quote.recommendations.length > 0 && (
          <RecommendationsBlock recommendations={quote.recommendations} variant="agent" />
        )}

        {/* Leyenda de fuentes */}
        <View style={styles.legendBlock} wrap={false}>
          <SectionLabel variant="light">Leyenda de fuentes</SectionLabel>
        </View>
        <View style={[styles.legendBlock, { marginTop: 0 }]} wrap={false}>
          <View style={styles.legendItem}>
            <SourceBadge source="INV_PROPIO" />
            <Text style={{ fontSize: fontSize.micro, color: colors.textOnLightMuted }}>
              Inventario propio
            </Text>
          </View>
          <View style={styles.legendItem}>
            <SourceBadge source="CORPORATIVO" />
            <Text style={{ fontSize: fontSize.micro, color: colors.textOnLightMuted }}>
              Tarifa corporativa
            </Text>
          </View>
          <View style={styles.legendItem}>
            <SourceBadge source="WEB" />
            <Text style={{ fontSize: fontSize.micro, color: colors.textOnLightMuted }}>
              Precio público web
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {quote.agency.legalName} · CIF {quote.agency.taxId}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
