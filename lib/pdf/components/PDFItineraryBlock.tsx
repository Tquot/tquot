import { View, Text } from "@react-pdf/renderer";
import type { AgencyBranding } from "@/lib/branding/types";
import type { Itinerary } from "@/lib/itinerary/types";

interface Props {
  itinerary: Itinerary;
  branding: AgencyBranding;
  styles: any;
}

export function PDFItineraryBlock({ itinerary, branding, styles }: Props) {
  return (
    <View>
      <Text style={styles.h1}>Itinerario</Text>
      {itinerary.days.map((day) => (
        <View key={day.dayNumber} style={{ marginBottom: 14 }} wrap={false}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              borderBottom: `1pt solid ${branding.secondaryColor}`,
              paddingBottom: 3,
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "bold",
                color: branding.primaryColor,
                width: 70,
              }}
            >
              Día {day.dayNumber}
            </Text>
            <Text style={{ ...styles.small, marginRight: 8 }}>
              {formatDate(day.date)}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", flex: 1 }}>
              {day.title}
            </Text>
          </View>
          <Text style={styles.paragraph}>{day.narrative}</Text>
          {day.highlights.length > 0 ? (
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}
            >
              {day.highlights.map((highlight, idx) => (
                <Text
                  key={idx}
                  style={{
                    fontSize: 8,
                    color: branding.accentColor,
                    border: `0.5pt solid ${branding.accentColor}`,
                    borderRadius: 2,
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                  }}
                >
                  {highlight}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
