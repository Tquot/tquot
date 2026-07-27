import { View, Text, StyleSheet, Link } from "@react-pdf/renderer";
import type { PremiumPdfQuote } from "../premium-types";
import {
  EXPERIENCE_FEATURE_LABELS,
  HOTEL_FEATURE_LABELS,
  TRANSFER_FEATURE_LABELS,
} from "@/lib/accessibility/catalog";

const styles = StyleSheet.create({
  section: { marginTop: 16 },
  h2: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    borderBottom: "1pt solid #ddd",
    paddingBottom: 2,
  },
  itemBlock: {
    marginTop: 6,
    padding: 6,
    backgroundColor: "#f9fafb",
    borderRadius: 2,
  },
  itemTitle: { fontSize: 10, fontWeight: "bold" },
  featureList: { fontSize: 8, marginTop: 2, lineHeight: 1.4 },
  sourceLine: { fontSize: 7, color: "#6b7280", marginTop: 3 },
  note: { fontSize: 8, fontStyle: "italic", marginTop: 3, color: "#374151" },
});

interface Props {
  quote: PremiumPdfQuote;
}

export function PDFAccessibilityBlock({ quote }: Props) {
  const hotels = quote.hotels.filter((h) => h.accessibility);
  const experiences = (quote.experiences ?? []).filter((e) => e.accessibility);
  const transfers = (quote.transfers ?? []).filter((t) => t.accessibility);

  if (hotels.length + experiences.length + transfers.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Información de accesibilidad</Text>

      {hotels.map((h) => (
        <ItemBlock
          key={h.id}
          title={`Hotel: ${h.name}`}
          features={h.accessibility!.features}
          labels={HOTEL_FEATURE_LABELS}
          source={h.accessibility!.source}
          verified={h.accessibility!.verified}
          sourceUrl={h.accessibility!.sourceUrl}
          notes={h.accessibility!.notes}
        />
      ))}

      {experiences.map((e) => (
        <ItemBlock
          key={e.id}
          title={`Experiencia: ${e.name}`}
          features={e.accessibility!.features}
          labels={EXPERIENCE_FEATURE_LABELS}
          source={e.accessibility!.source}
          verified={e.accessibility!.verified}
          sourceUrl={e.accessibility!.sourceUrl}
          notes={e.accessibility!.notes}
        />
      ))}

      {transfers.map((t) => (
        <ItemBlock
          key={t.id}
          title={`Traslado: ${t.name ?? t.description ?? t.id}`}
          features={t.accessibility!.features}
          labels={TRANSFER_FEATURE_LABELS}
          source={t.accessibility!.source}
          verified={t.accessibility!.verified}
          sourceUrl={t.accessibility!.sourceUrl}
          notes={t.accessibility!.notes}
        />
      ))}
    </View>
  );
}

interface ItemProps {
  title: string;
  features: Record<string, boolean | undefined>;
  labels: Record<string, string>;
  source: string;
  verified: boolean;
  sourceUrl?: string;
  notes?: string;
}

function ItemBlock({
  title,
  features,
  labels,
  source,
  verified,
  sourceUrl,
  notes,
}: ItemProps) {
  const present = Object.entries(features)
    .filter(([, v]) => v)
    .map(([k]) => labels[k as keyof typeof labels])
    .filter(Boolean);

  return (
    <View style={styles.itemBlock} wrap={false}>
      <Text style={styles.itemTitle}>{title}</Text>
      {present.length > 0 ? (
        <Text style={styles.featureList}>{present.join(" · ")}</Text>
      ) : (
        <Text style={{ ...styles.featureList, color: "#6b7280" }}>
          Sin características registradas.
        </Text>
      )}
      <Text style={styles.sourceLine}>
        Fuente: {source}
        {verified ? " · verificado" : " · sin verificar"}
        {sourceUrl ? " · " : ""}
        {sourceUrl ? (
          <Link src={sourceUrl} style={{ color: "#2563eb" }}>
            ficha completa
          </Link>
        ) : null}
      </Text>
      {notes ? <Text style={styles.note}>{notes}</Text> : null}
    </View>
  );
}

export function hasAccessibilityInfo(quote: PremiumPdfQuote): boolean {
  return (
    quote.hotels.some((h) => h.accessibility) ||
    (quote.experiences ?? []).some((e) => e.accessibility) ||
    (quote.transfers ?? []).some((t) => t.accessibility)
  );
}
