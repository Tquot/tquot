/**
 * Etiqueta visual que marca la fuente de un precio en el PDF del agente.
 *
 * [INV-PROPIO]   verde   - inventario propio
 * [CORPORATIVO]  azul    - tarifa corporativa
 * [WEB]          marrón  - precio público web
 *
 * Estas etiquetas NO aparecen nunca en el PDF del cliente.
 */

import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { fonts, fontSize, fontWeight, sourceLabels } from "../theme";
import type { PriceSource } from "../theme";

interface SourceBadgeProps {
  source: PriceSource;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const meta = sourceLabels[source];

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderWidth: 0.5,
      borderColor: meta.color,
      borderRadius: 2,
      alignSelf: "flex-start",
    },
    text: {
      fontFamily: fonts.body,
      fontSize: fontSize.micro,
      fontWeight: fontWeight.semibold,
      color: meta.color,
      letterSpacing: 0.5,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{meta.label}</Text>
    </View>
  );
}
