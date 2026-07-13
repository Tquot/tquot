import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Hotel } from "@/lib/quote-engine/types";
import type { HotelContent } from "@/lib/providers/hotelbeds/content-types";
import { groupFacilities } from "@/lib/providers/hotelbeds/content-mapper";

const styles = StyleSheet.create({
  section: { marginTop: 10 },
  h3: { fontSize: 11, fontWeight: "bold", marginBottom: 4 },
  paragraph: { fontSize: 9, lineHeight: 1.5 },
  facilitiesGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  facilityGroup: { width: "50%", paddingRight: 8, marginBottom: 6 },
  groupLabel: { fontSize: 9, fontWeight: "bold", marginBottom: 2 },
  facilityItem: { fontSize: 8, color: "#4b5563", marginBottom: 1 },
  cancellation: {
    fontSize: 8,
    backgroundColor: "#fef3c7",
    padding: 6,
    borderRadius: 2,
    marginTop: 4,
  },
});

interface Props {
  hotel?: Hotel;
  content?: HotelContent | null;
}

export function PDFHotelContentBlock({ hotel, content: contentProp }: Props) {
  const content = contentProp ?? hotel?.content;
  if (!content) return null;

  const grouped = groupFacilities(content.facilities);

  return (
    <View style={styles.section}>
      {content.descriptionLong ? (
        <>
          <Text style={styles.h3}>Sobre el hotel</Text>
          <Text style={styles.paragraph}>{content.descriptionLong}</Text>
        </>
      ) : null}

      {hasFacilities(grouped) ? (
        <>
          <Text style={{ ...styles.h3, marginTop: 8 }}>Instalaciones</Text>
          <View style={styles.facilitiesGrid}>
            <FacilityGroupBlock label="Habitación" items={grouped.rooms} />
            <FacilityGroupBlock label="Bienestar" items={grouped.wellness} />
            <FacilityGroupBlock label="Servicios" items={grouped.building} />
            <FacilityGroupBlock label="Gastronomía" items={grouped.food} />
            <FacilityGroupBlock label="Negocios" items={grouped.business} />
            <FacilityGroupBlock label="Familia" items={grouped.family} />
            <FacilityGroupBlock label="Otros" items={grouped.other} />
          </View>
        </>
      ) : null}

      {content.cancellationPolicies.length > 0 ? (
        <View style={styles.cancellation}>
          <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 2 }}>
            Política de cancelación
          </Text>
          {content.cancellationPolicies.map((p, idx) => (
            <Text key={idx} style={{ fontSize: 8 }}>
              · {p.amount} {p.currency} desde {formatDate(p.from)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FacilityGroupBlock({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.facilityGroup}>
      <Text style={styles.groupLabel}>{label}</Text>
      {items.slice(0, 6).map((item, idx) => (
        <Text key={idx} style={styles.facilityItem}>
          · {item}
        </Text>
      ))}
      {items.length > 6 ? (
        <Text style={{ ...styles.facilityItem, fontStyle: "italic" }}>
          y {items.length - 6} más
        </Text>
      ) : null}
    </View>
  );
}

function hasFacilities(g: ReturnType<typeof groupFacilities>): boolean {
  return Object.values(g).some((arr) => arr.length > 0);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES");
}
