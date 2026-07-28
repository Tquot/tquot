import React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { colors, fonts, fontSize, fontWeight, spacing } from "../theme";
import {
  formatFareLabel,
  formatStopsLabel,
  resolveFlightDetails,
} from "../utils/resolve-flight-details";
import { formatDate } from "../utils/format";
import type { QuoteLineItem } from "../types";

const styles = StyleSheet.create({
  block: {
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 3,
  },
  logo: {
    width: 16,
    height: 16,
    objectFit: "contain",
  },
  airline: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.textOnLight,
  },
  route: {
    fontFamily: fonts.mono,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  muted: {
    fontSize: fontSize.small,
    color: colors.textOnLightMuted,
  },
  mono: {
    fontFamily: fonts.mono,
    fontSize: fontSize.small,
    color: colors.textOnLight,
  },
  sep: {
    fontSize: fontSize.small,
    color: colors.textOnLightMuted,
  },
});

interface PDFFlightDetailsRowsProps {
  item: QuoteLineItem;
  /** Indent for agent cost-grid alignment */
  indent?: number;
}

export function PDFFlightDetailsRows({
  item,
  indent = 0,
}: PDFFlightDetailsRowsProps) {
  const details = resolveFlightDetails(item);
  const origin = details.originIata ?? "?";
  const destination = details.destinationIata ?? "?";
  const route = `${origin} → ${destination}`;

  const depDate = details.departureDate
    ? formatDate(details.departureDate)
    : null;
  const depTime = details.departureTime ?? "—";
  const arrTime = details.arrivalTime ?? "—";
  const scheduleLeft = [depDate, depTime].filter(Boolean).join(" ");
  const cabin = details.cabinClass ?? "—";
  const fare = formatFareLabel(details);

  return (
    <View style={indent ? { ...styles.block, marginLeft: indent } : styles.block}>
      {/* Row 1: Airline | Origin → Destination | Flight number */}
      <View style={styles.row}>
        {details.airlineLogoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
          <Image src={details.airlineLogoUrl} style={styles.logo} />
        ) : null}
        <Text style={styles.airline}>
          {details.airlineName ?? item.description}
        </Text>
        <Text style={styles.sep}>·</Text>
        <Text style={styles.route}>{route}</Text>
        {details.flightNumber ? (
          <>
            <Text style={styles.sep}>·</Text>
            <Text style={styles.mono}>{details.flightNumber}</Text>
          </>
        ) : null}
      </View>

      {/* Row 2: Departure → Arrival | Duration | Stops */}
      <View style={styles.row}>
        <Text style={styles.mono}>
          {scheduleLeft} → {arrTime}
        </Text>
        <Text style={styles.sep}>·</Text>
        <Text style={styles.muted}>{details.duration ?? "—"}</Text>
        <Text style={styles.sep}>·</Text>
        <Text style={styles.muted}>{formatStopsLabel(details.stops)}</Text>
      </View>

      {/* Row 3: Cabin | Fare */}
      <View style={styles.row}>
        <Text style={styles.muted}>{cabin}</Text>
        <Text style={styles.sep}>·</Text>
        <Text style={styles.muted}>{fare}</Text>
      </View>
    </View>
  );
}
