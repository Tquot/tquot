/**
 * ─────────────────────────────────────────────────────────────
 *  PDF CLIENTE — Propuesta de viaje premium
 * ─────────────────────────────────────────────────────────────
 *
 *  Diseño nivel agencia de lujo. El cliente recibe esto con orgullo.
 *
 *  Decisiones de diseño:
 *  - Portada oscura edge-to-edge (azul tinta + dorado) con jerarquía editorial.
 *  - Páginas internas en crema cálido (paper) para legibilidad larga.
 *  - Cero información interna: ni márgenes, ni costes netos, ni fuentes.
 *  - Tipografía serif (Cormorant Garamond) para títulos.
 *  - Disclaimer legal al pie en cada página.
 */

import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fonts, fontSize, fontWeight, spacing, page } from "../theme";
import { AgencyLogo } from "../components/AgencyLogo";
import { GoldRule, SectionLabel } from "../components/Decoration";
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatPaxCount,
} from "../utils/format";
import type { Quote } from "../types";

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ──── PORTADA (página 1) — fondo oscuro edge-to-edge
  cover: {
    backgroundColor: colors.ink,
    padding: 0,
    fontFamily: fonts.body,
    color: colors.textOnDark,
  },
  coverInner: {
    flex: 1,
    paddingHorizontal: 48,
    paddingTop: 64,
    paddingBottom: 80,
  },

  coverTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 80,
  },

  coverEyebrow: {
    fontFamily: fonts.body,
    fontSize: fontSize.tiny,
    color: colors.gold,
    letterSpacing: 4,
    textTransform: "uppercase",
    fontWeight: fontWeight.medium,
    marginBottom: spacing.lg,
  },

  coverHeroTitle: {
    fontFamily: fonts.display,
    fontSize: fontSize.hero,
    fontWeight: fontWeight.light,
    color: colors.textOnDark,
    lineHeight: 1.1,
    letterSpacing: -0.5,
  },

  coverDestination: {
    fontFamily: fonts.display,
    fontSize: fontSize.hero + 8,
    fontWeight: fontWeight.semibold,
    color: colors.gold,
    lineHeight: 1.1,
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },

  coverMetaBlock: {
    marginTop: spacing.xxxl,
  },
  coverMetaRow: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  coverMetaCol: {
    flex: 1,
  },
  coverMetaLabel: {
    fontSize: fontSize.micro,
    color: colors.textOnDarkMuted,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  coverMetaValue: {
    fontFamily: fonts.display,
    fontSize: fontSize.h4,
    color: colors.textOnDark,
    fontWeight: fontWeight.regular,
  },

  coverFooter: {
    position: "absolute",
    bottom: 48,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  coverFooterLabel: {
    fontSize: fontSize.micro,
    color: colors.textOnDarkMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  coverReference: {
    fontFamily: fonts.mono,
    fontSize: fontSize.small,
    color: colors.gold,
    letterSpacing: 1,
  },

  // ──── PÁGINAS INTERNAS — fondo claro
  page: {
    backgroundColor: colors.paper,
    paddingTop: 40,
    paddingBottom: 64,
    paddingHorizontal: page.client.paddingX,
    fontFamily: fonts.body,
    fontSize: fontSize.base,
    color: colors.textOnLight,
  },

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gold,
    borderBottomStyle: "solid",
  },
  pageHeaderTitle: {
    fontFamily: fonts.display,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.semibold,
    color: colors.textOnLight,
  },
  pageHeaderRef: {
    fontFamily: fonts.mono,
    fontSize: fontSize.tiny,
    color: colors.textOnLightMuted,
    letterSpacing: 1,
  },

  // ──── Mensaje del agente
  agentMessage: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.paperSoft,
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    borderLeftStyle: "solid",
  },
  agentMessageText: {
    fontFamily: fonts.display,
    fontSize: fontSize.lead,
    fontWeight: fontWeight.regular,
    color: colors.textOnLight,
    lineHeight: 1.6,
    fontStyle: "italic",
  },
  agentMessageSignature: {
    marginTop: spacing.md,
    fontSize: fontSize.small,
    color: colors.textOnLightMuted,
    textAlign: "right",
  },

  // ──── Itinerario (líneas)
  lineItem: {
    paddingVertical: spacing.lg,
    flexDirection: "row",
    gap: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.gold,
    borderBottomStyle: "solid",
  },
  lineNumber: {
    width: 32,
    height: 32,
    backgroundColor: colors.ink,
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
    paddingTop: 7,
  },
  lineContent: {
    flex: 1,
  },
  lineCategory: {
    fontSize: fontSize.micro,
    color: colors.gold,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  lineDescription: {
    fontFamily: fonts.display,
    fontSize: fontSize.h4,
    fontWeight: fontWeight.semibold,
    color: colors.textOnLight,
    marginBottom: 2,
  },
  lineSubtitle: {
    fontSize: fontSize.small,
    color: colors.textOnLightMuted,
    lineHeight: 1.5,
  },
  linePrice: {
    fontFamily: fonts.display,
    fontSize: fontSize.h4,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    minWidth: 80,
    textAlign: "right",
  },

  // ──── Total
  totalBlock: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.ink,
    color: colors.textOnDark,
  },
  totalLabel: {
    fontSize: fontSize.tiny,
    color: colors.gold,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  totalValue: {
    fontFamily: fonts.display,
    fontSize: fontSize.h1,
    fontWeight: fontWeight.semibold,
    color: colors.textOnDark,
  },
  totalCaption: {
    fontSize: fontSize.tiny,
    color: colors.textOnDarkMuted,
    marginTop: spacing.xs,
  },

  // ──── Condiciones
  conditionsBlock: {
    marginTop: spacing.xxl,
  },
  conditionsTitle: {
    fontFamily: fonts.display,
    fontSize: fontSize.h4,
    fontWeight: fontWeight.semibold,
    color: colors.textOnLight,
    marginBottom: spacing.sm,
  },
  conditionsText: {
    fontSize: fontSize.small,
    color: colors.textOnLight,
    lineHeight: 1.6,
    marginBottom: spacing.md,
  },

  // ──── Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: page.client.paddingX,
    right: page.client.paddingX,
  },
  footerDivider: {
    height: 0.5,
    backgroundColor: colors.gold,
    opacity: 0.4,
    marginBottom: spacing.sm,
  },
  footerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  footerAgency: {
    fontSize: fontSize.micro,
    color: colors.textOnLight,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
  },
  footerPage: {
    fontSize: fontSize.micro,
    color: colors.textOnLightMuted,
    fontFamily: fonts.mono,
  },
  footerDisclaimer: {
    fontSize: fontSize.micro - 1,
    color: colors.textOnLightMuted,
    lineHeight: 1.4,
  },
});

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────

interface ClientPDFProps {
  quote: Quote;
}

export function ClientPDF({ quote }: ClientPDFProps) {
  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      flight: "Vuelo",
      hotel: "Alojamiento",
      transfer: "Traslado",
      activity: "Experiencia",
      insurance: "Seguro de viaje",
      other: "Servicio",
    };
    return map[cat] ?? cat;
  };

  const defaultDisclaimer =
    "Esta propuesta tiene carácter informativo y no constituye contrato. Los precios están sujetos a disponibilidad y pueden variar hasta la confirmación de la reserva. Tarifas y servicios sujetos a las condiciones generales de contratación de la agencia, disponibles a petición. La reserva requerirá señal y aceptación expresa de las condiciones. La agencia actúa como intermediaria con los proveedores finales de los servicios contratados.";

  const disclaimer = quote.agency.legalDisclaimer ?? defaultDisclaimer;

  return (
    <Document
      title={`Propuesta ${quote.reference} · ${quote.trip.destination}`}
      author={quote.agency.name}
      subject="Propuesta de viaje"
    >
      {/* ────────────── PORTADA ────────────── */}
      <Page size="A4" style={styles.cover}>
        <View style={styles.coverInner}>
          <View style={styles.coverTopRow}>
            <AgencyLogo agency={quote.agency} variant="dark" maxWidth={120} maxHeight={48} />
            <Text style={[styles.coverEyebrow, { marginBottom: 0 }]}>
              Propuesta de viaje
            </Text>
          </View>

          <Text style={styles.coverEyebrow}>Una experiencia para</Text>
          <Text style={styles.coverHeroTitle}>{quote.client.fullName}</Text>

          <View style={{ marginTop: spacing.xxxl }}>
            <Text style={styles.coverEyebrow}>Destino</Text>
            <Text style={styles.coverDestination}>{quote.trip.destination}</Text>
          </View>

          <View style={styles.coverMetaBlock}>
            <GoldRule marginY={spacing.lg} />
            <View style={styles.coverMetaRow}>
              <View style={styles.coverMetaCol}>
                <Text style={styles.coverMetaLabel}>Fechas</Text>
                <Text style={styles.coverMetaValue}>
                  {formatDateRange(quote.trip.departureDate, quote.trip.returnDate)}
                </Text>
              </View>
              <View style={styles.coverMetaCol}>
                <Text style={styles.coverMetaLabel}>Duración</Text>
                <Text style={styles.coverMetaValue}>
                  {quote.trip.nights} {quote.trip.nights === 1 ? "noche" : "noches"}
                </Text>
              </View>
            </View>
            <View style={styles.coverMetaRow}>
              <View style={styles.coverMetaCol}>
                <Text style={styles.coverMetaLabel}>Viajeros</Text>
                <Text style={styles.coverMetaValue}>
                  {formatPaxCount(
                    quote.trip.adults,
                    quote.trip.children,
                    quote.trip.infants
                  )}
                </Text>
              </View>
              <View style={styles.coverMetaCol}>
                <Text style={styles.coverMetaLabel}>Origen</Text>
                <Text style={styles.coverMetaValue}>{quote.trip.origin}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.coverFooter}>
          <View>
            <Text style={styles.coverFooterLabel}>Preparado por</Text>
            <Text style={[styles.coverMetaValue, { fontSize: fontSize.body }]}>
              {quote.agent.name}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.coverFooterLabel}>Referencia</Text>
            <Text style={styles.coverReference}>{quote.reference}</Text>
          </View>
        </View>
      </Page>

      {/* ────────────── ITINERARIO Y PRECIOS ────────────── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>Propuesta de viaje</Text>
          <Text style={styles.pageHeaderRef}>{quote.reference}</Text>
        </View>

        {/* Mensaje del agente */}
        {quote.clientMessage && (
          <View style={styles.agentMessage}>
            <Text style={styles.agentMessageText}>“{quote.clientMessage}”</Text>
            <Text style={styles.agentMessageSignature}>
              — {quote.agent.name}, {quote.agency.name}
            </Text>
          </View>
        )}

        {/* Líneas */}
        <SectionLabel variant="light">Su viaje, paso a paso</SectionLabel>

        {quote.lineItems.map((item, index) => (
          <View key={item.id} style={styles.lineItem} wrap={false}>
            <Text style={styles.lineNumber}>{index + 1}</Text>
            <View style={styles.lineContent}>
              <Text style={styles.lineCategory}>{categoryLabel(item.category)}</Text>
              <Text style={styles.lineDescription}>{item.description}</Text>
              {item.subtitle && <Text style={styles.lineSubtitle}>{item.subtitle}</Text>}
            </View>
            <Text style={styles.linePrice}>
              {formatCurrency(item.publicPrice, quote.totals.currency)}
            </Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalBlock} wrap={false}>
          <Text style={styles.totalLabel}>Total propuesta</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(quote.totals.publicPrice, quote.totals.currency)}
          </Text>
          <Text style={styles.totalCaption}>
            Precio total para{" "}
            {formatPaxCount(quote.trip.adults, quote.trip.children, quote.trip.infants)} ·
            Impuestos incluidos · Válido hasta {formatDate(quote.validUntil)}
          </Text>
        </View>

        {/* Condiciones */}
        {(quote.paymentTerms || quote.cancellationPolicy) && (
          <View style={styles.conditionsBlock}>
            {quote.paymentTerms && (
              <>
                <Text style={styles.conditionsTitle}>Condiciones de pago</Text>
                <Text style={styles.conditionsText}>{quote.paymentTerms}</Text>
              </>
            )}
            {quote.cancellationPolicy && (
              <>
                <Text style={styles.conditionsTitle}>Política de cancelación</Text>
                <Text style={styles.conditionsText}>{quote.cancellationPolicy}</Text>
              </>
            )}
          </View>
        )}

        {/* Footer con disclaimer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerDivider} />
          <View style={styles.footerTop}>
            <Text style={styles.footerAgency}>
              {quote.agency.name.toUpperCase()}
            </Text>
            <Text
              style={styles.footerPage}
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
            />
          </View>
          <Text style={styles.footerDisclaimer}>{disclaimer}</Text>
        </View>
      </Page>
    </Document>
  );
}
