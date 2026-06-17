import { View, Text, Link, StyleSheet } from "@react-pdf/renderer";
import type { Recommendation } from "@/lib/recommendations/types";
import { getEntry, type ServiceCategory } from "@/lib/recommendations/catalog";

const styles = StyleSheet.create({
  section: { marginTop: 20 },
  h2: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    borderBottom: "1pt solid #ddd",
    paddingBottom: 2,
  },
  disclaimer: {
    fontSize: 8,
    color: "#a16207",
    backgroundColor: "#fef3c7",
    padding: 6,
    borderRadius: 2,
    marginBottom: 8,
  },
  categoryGroup: { marginTop: 8 },
  categoryLabel: { fontSize: 10, fontWeight: "bold", marginBottom: 3 },
  card: { padding: 6, backgroundColor: "#f9fafb", borderRadius: 2, marginBottom: 4 },
  providerName: { fontSize: 9, fontWeight: "bold" },
  providerDesc: { fontSize: 8, marginTop: 2 },
  providerMeta: { fontSize: 7, color: "#6b7280", marginTop: 3 },
  link: { color: "#2563eb" },
});

interface Props {
  recommendations: Recommendation[];
  variant: "agent" | "client";
}

export function RecommendationsBlock({ recommendations, variant }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.h2}>Servicios adicionales sugeridos</Text>

      {variant === "agent" && (
        <View style={styles.disclaimer}>
          <Text>
            ⚠ Estos proveedores se obtuvieron mediante búsqueda web automática. Verifica datos
            de contacto y disponibilidad antes de derivar al cliente.
          </Text>
        </View>
      )}

      {recommendations.map((rec, idx) => (
        <CategoryBlock key={idx} recommendation={rec} variant={variant} />
      ))}
    </View>
  );
}

function CategoryBlock({
  recommendation,
  variant,
}: {
  recommendation: Recommendation;
  variant: "agent" | "client";
}) {
  const entry = getEntry(recommendation.category as ServiceCategory);

  return (
    <View style={styles.categoryGroup}>
      <Text style={styles.categoryLabel}>{entry.label}</Text>
      {recommendation.providers.map((p, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.providerName}>{p.name}</Text>
          <Text style={styles.providerDesc}>{p.description}</Text>
          <Text style={styles.providerMeta}>
            <Link src={p.website} style={styles.link}>
              {prettyHost(p.website)}
            </Link>
            {p.contact?.email ? ` · ${p.contact.email}` : ""}
            {p.contact?.phone ? ` · ${p.contact.phone}` : ""}
          </Text>
          {variant === "agent" && p.confidence === "low" && (
            <Text style={{ ...styles.providerMeta, color: "#dc2626" }}>
              Confianza baja — verifica antes de recomendar
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
