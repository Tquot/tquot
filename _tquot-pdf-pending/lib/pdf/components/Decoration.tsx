/**
 * Detalles decorativos premium:
 * - GoldRule: línea horizontal dorada con dos puntos en los extremos
 * - GoldDivider: línea fina dorada
 * - SectionLabel: etiqueta de sección con dot dorado al inicio
 */

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fonts, fontSize, fontWeight, spacing } from "../theme";

// ─────────────────────────────────────────────────────────────
// GoldRule
// ─────────────────────────────────────────────────────────────

interface GoldRuleProps {
  width?: number | string;
  marginY?: number;
}

export function GoldRule({ width = "100%", marginY = spacing.lg }: GoldRuleProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginVertical: marginY,
        width,
      }}
    >
      <View
        style={{ width: 4, height: 4, backgroundColor: colors.gold, borderRadius: 2 }}
      />
      <View
        style={{
          flex: 1,
          height: 0.5,
          backgroundColor: colors.gold,
          marginHorizontal: 6,
        }}
      />
      <View
        style={{ width: 4, height: 4, backgroundColor: colors.gold, borderRadius: 2 }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// GoldDivider — línea fina simple
// ─────────────────────────────────────────────────────────────

export function GoldDivider({ marginY = spacing.md }: { marginY?: number }) {
  return (
    <View
      style={{
        height: 0.5,
        backgroundColor: colors.gold,
        opacity: 0.4,
        marginVertical: marginY,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// SectionLabel
// ─────────────────────────────────────────────────────────────

interface SectionLabelProps {
  children: string;
  variant?: "light" | "dark";
}

export function SectionLabel({ children, variant = "dark" }: SectionLabelProps) {
  const color = variant === "dark" ? colors.gold : colors.gold;
  const textColor = variant === "dark" ? colors.textOnDark : colors.textOnLight;

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    dot: {
      width: 5,
      height: 5,
      backgroundColor: color,
      marginRight: spacing.sm,
    },
    label: {
      fontFamily: fonts.body,
      fontSize: fontSize.tiny,
      fontWeight: fontWeight.semibold,
      color: textColor,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}
