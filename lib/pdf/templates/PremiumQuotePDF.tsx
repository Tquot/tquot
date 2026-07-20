import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { AgencyBranding } from "@/lib/branding/types";
import { PDFCover } from "../components/PDFCover";
import { PDFHotelBlock } from "../components/PDFHotelBlock";
import { PDFItineraryBlock } from "../components/PDFItineraryBlock";
import { PDFFooter } from "../components/PDFFooter";
import { RecommendationsBlock } from "../components/RecommendationsBlock";
import type { PremiumPdfFlight, PremiumPdfQuote } from "../premium-types";

interface Props {
  quote: PremiumPdfQuote;
  branding: AgencyBranding;
  variant: "agent" | "client";
}

export function PremiumQuotePDF({ quote, branding, variant }: Props) {
  const styles = createStyles(branding);

  return (
    <Document
      title={`Cotización ${quote.id}`}
      author={branding.agencyLegalName ?? "TQuot"}
    >
      <Page size="A4" style={styles.coverPage}>
        <PDFCover quote={quote} branding={branding} styles={styles} />
      </Page>

      {quote.itinerary ? (
        <Page size="A4" style={styles.page}>
          <PDFItineraryBlock
            itinerary={quote.itinerary}
            branding={branding}
            styles={styles}
          />
          <PDFFooter branding={branding} styles={styles} pageLabel="Itinerario" />
        </Page>
      ) : null}

      {quote.hotels.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Hospedaje</Text>
          {quote.hotels.map((hotel) => (
            <PDFHotelBlock
              key={hotel.id}
              hotel={hotel}
              variant={variant}
              branding={branding}
              styles={styles}
            />
          ))}
          <PDFFooter branding={branding} styles={styles} pageLabel="Hoteles" />
        </Page>
      ) : null}

      {quote.flights.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Vuelos</Text>
          {quote.flights.map((flight) => (
            <FlightBlockPdf
              key={flight.id}
              flight={flight}
              variant={variant}
              styles={styles}
              branding={branding}
            />
          ))}
          <PDFFooter branding={branding} styles={styles} pageLabel="Vuelos" />
        </Page>
      ) : null}

      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Resumen económico</Text>
        <SummaryBlockPdf quote={quote} variant={variant} styles={styles} branding={branding} />

        {variant === "agent" && quote.recommendations ? (
          <RecommendationsBlock
            recommendations={quote.recommendations}
            variant="agent"
          />
        ) : null}

        <PDFFooter branding={branding} styles={styles} pageLabel="Resumen" />
      </Page>
    </Document>
  );
}

function FlightBlockPdf({
  flight,
  variant,
  styles,
  branding,
}: {
  flight: PremiumPdfFlight;
  variant: "agent" | "client";
  styles: ReturnType<typeof createStyles>;
  branding: AgencyBranding;
}) {
  const route = `${flight.origin ?? "?"} → ${flight.destination ?? "?"}`;
  const label = flight.name ?? `${flight.carrierName ?? flight.carrier} ${route}`;

  return (
    <View
      style={{
        marginBottom: 12,
        padding: 10,
        border: "1pt solid #e5e7eb",
        borderRadius: 4,
      }}
      wrap={false}
    >
      <Text style={styles.h3}>{label}</Text>
      <Text style={styles.small}>
        {flight.departureDate ?? ""} · {route}
      </Text>
      <View style={{ marginTop: 6, alignSelf: "flex-end" }}>
        {variant === "agent" ? (
          <>
            <Text style={styles.small}>
              Neto: {Math.round(flight.price)} {flight.currency}
            </Text>
            <Text style={{ ...styles.h3, color: branding.primaryColor }}>
              PVP incluido en total
            </Text>
          </>
        ) : (
          <Text style={{ ...styles.h3, color: branding.primaryColor }}>
            Incluido
          </Text>
        )}
      </View>
    </View>
  );
}

function SummaryBlockPdf({
  quote,
  variant,
  styles,
  branding,
}: {
  quote: PremiumPdfQuote;
  variant: "agent" | "client";
  styles: ReturnType<typeof createStyles>;
  branding: AgencyBranding;
}) {
  const { pricing } = quote;
  const currency = pricing.currency;

  return (
    <View style={{ marginTop: 8 }}>
      {variant === "agent" ? (
        <>
          <SummaryRow
            label="Coste neto"
            value={`${Math.round(pricing.baseTotal)} ${currency}`}
            styles={styles}
          />
          <SummaryRow
            label="Margen"
            value={`${Math.round(pricing.margin)} ${currency}`}
            styles={styles}
          />
        </>
      ) : null}
      <View
        style={{
          marginTop: 8,
          padding: 12,
          backgroundColor: "#f8fafc",
          borderRadius: 4,
        }}
      >
        <Text style={styles.small}>Total propuesta</Text>
        <Text style={{ ...styles.h2, color: branding.primaryColor }}>
          {Math.round(pricing.finalTotal)} {currency}
        </Text>
      </View>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
      }}
    >
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.paragraph}>{value}</Text>
    </View>
  );
}

function createStyles(branding: AgencyBranding) {
  return StyleSheet.create({
    coverPage: {
      backgroundColor: branding.primaryColor,
      color: "#ffffff",
      padding: 0,
    },
    page: {
      padding: 32,
      fontSize: 10,
      fontFamily: branding.fontFamily,
      color: branding.textColor,
    },
    h1: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 12,
      color: branding.primaryColor,
      borderBottom: `2pt solid ${branding.primaryColor}`,
      paddingBottom: 4,
    },
    h2: {
      fontSize: 13,
      fontWeight: "bold",
      marginTop: 12,
      marginBottom: 6,
      color: branding.primaryColor,
    },
    h3: {
      fontSize: 11,
      fontWeight: "bold",
      marginBottom: 4,
    },
    paragraph: {
      fontSize: 10,
      lineHeight: 1.5,
      marginBottom: 6,
    },
    small: {
      fontSize: 8,
      color: "#6b7280",
    },
    accent: { color: branding.accentColor },
    primary: { color: branding.primaryColor },
    secondary: { color: branding.secondaryColor },
  });
}
