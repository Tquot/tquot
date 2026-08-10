import { View, Text, Link, StyleSheet } from "@react-pdf/renderer";
import { CATEGORY_ES } from "@/lib/recommendations/providers/categories";
import type { ProviderBlock } from "@/lib/recommendations/providers/types";
import { shouldRenderExternalProvidersOnPdf } from "@/lib/pdf/external-providers-guard";

export { shouldRenderExternalProvidersOnPdf } from "@/lib/pdf/external-providers-guard";

const styles = StyleSheet.create({
  section: { marginTop: 20 },
  tag: {
    fontSize: 7,
    color: "#92400e",
    backgroundColor: "#fef3c7",
    padding: 4,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  h2: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    borderBottom: "1pt solid #ddd",
    paddingBottom: 2,
  },
  lead: { fontSize: 8, color: "#6b7280", marginBottom: 8 },
  disclaimer: {
    fontSize: 8,
    color: "#a16207",
    backgroundColor: "#fef3c7",
    padding: 6,
    borderRadius: 2,
    marginTop: 8,
  },
  categoryGroup: { marginTop: 8 },
  categoryLabel: { fontSize: 10, fontWeight: "bold", marginBottom: 3 },
  card: {
    padding: 6,
    backgroundColor: "#f9fafb",
    borderRadius: 2,
    marginBottom: 4,
  },
  providerName: { fontSize: 9, fontWeight: "bold" },
  providerArea: { fontSize: 7, color: "#6b7280", marginTop: 1 },
  providerDesc: { fontSize: 8, marginTop: 2 },
  providerMeta: { fontSize: 7, color: "#6b7280", marginTop: 3 },
  link: { color: "#2563eb" },
});

interface Props {
  blocks: ProviderBlock[];
  variant: "agent" | "client";
}

export function ExternalProvidersBlock({ blocks, variant }: Props) {
  if (!shouldRenderExternalProvidersOnPdf(variant, blocks)) return null;

  const usable = blocks.filter((b) => b.providers.length > 0);

  return (
    <View style={styles.section}>
      <Text style={styles.tag}>Solo versión agencia</Text>
      <Text style={styles.h2}>Operadores de contacto</Text>
      <Text style={styles.lead}>
        Para las categorías sin proveedor conectado. Datos comprobados en la web
        oficial de cada operador en la fecha indicada.
      </Text>

      {usable.map((block) => (
        <View
          key={`${block.category}:${block.destination}`}
          style={styles.categoryGroup}
        >
          <Text style={styles.categoryLabel}>
            {CATEGORY_ES[block.category]} · {block.destination}
          </Text>
          {block.providers.map((p) => (
            <View key={p.id} style={styles.card}>
              <Text style={styles.providerName}>{p.name}</Text>
              {p.serviceArea ? (
                <Text style={styles.providerArea}>{p.serviceArea}</Text>
              ) : null}
              <Text style={styles.providerDesc}>{p.description}</Text>
              <Text style={styles.providerMeta}>
                <Link src={p.website.value} style={styles.link}>
                  {hostOf(p.website.value)}
                </Link>
                {p.email
                  ? ` · ${p.email.value}${
                      p.email.confidence !== "verified"
                        ? " (sin confirmar)"
                        : ""
                    }`
                  : ""}
                {p.phone ? ` · ${p.phone.value}` : ""}
              </Text>
              <Text style={styles.providerMeta}>
                Comprobado el{" "}
                {new Date(p.checkedAt).toLocaleDateString("es-ES")}
              </Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.disclaimer}>
        <Text>
          Datos localizados automáticamente en las webs oficiales. Confirma
          disponibilidad y condiciones directamente con el operador antes de
          comprometer nada con el cliente.
        </Text>
      </View>
    </View>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
