/**
 * Logo de agencia.
 *
 * Si la agencia tiene logoUrl, lo renderiza. Si no, renderiza un wordmark
 * tipográfico elegante con el nombre. Esto garantiza que el PDF nunca
 * queda "vacío" arriba.
 */

import React from "react";
import { View, Image, Text, StyleSheet } from "@react-pdf/renderer";
import { colors, fonts, fontSize, fontWeight } from "../theme";
import type { Agency } from "../types";

interface AgencyLogoProps {
  agency: Agency;
  variant: "light" | "dark";   // light = sobre fondo claro, dark = sobre fondo oscuro
  maxWidth?: number;
  maxHeight?: number;
}

export function AgencyLogo({
  agency,
  variant,
  maxWidth = 140,
  maxHeight = 56,
}: AgencyLogoProps) {
  const textColor = variant === "dark" ? colors.textOnDark : colors.textOnLight;

  if (agency.logoUrl) {
    return (
      <View>
        <Image
          src={agency.logoUrl}
          style={{
            maxWidth,
            maxHeight,
            objectFit: "contain",
          }}
        />
      </View>
    );
  }

  // Fallback: wordmark tipográfico
  const styles = StyleSheet.create({
    wordmark: {
      fontFamily: fonts.display,
      fontSize: fontSize.h3,
      fontWeight: fontWeight.semibold,
      color: textColor,
      letterSpacing: 1.5,
    },
  });

  return (
    <View>
      <Text style={styles.wordmark}>{agency.name.toUpperCase()}</Text>
    </View>
  );
}
