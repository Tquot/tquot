import { View, Text, Image } from "@react-pdf/renderer";
import type { AgencyBranding } from "@/lib/branding/types";
import type { PremiumPdfHotel } from "../premium-types";

interface Props {
  hotel: PremiumPdfHotel;
  variant: "agent" | "client";
  branding: AgencyBranding;
  styles: any;
}

export function PDFHotelBlock({ hotel, variant, branding, styles }: Props) {
  const totalStay = Math.round(hotel.netPrice * hotel.nights);

  return (
    <View
      style={{
        marginBottom: 16,
        flexDirection: "row",
        border: "1pt solid #e5e7eb",
        borderRadius: 4,
        overflow: "hidden",
      }}
      wrap={false}
    >
      {hotel.imageUrl ? (
        <Image
          src={hotel.imageUrl}
          style={{ width: 140, height: 140, objectFit: "cover" }}
        />
      ) : null}
      <View style={{ flex: 1, padding: 10 }}>
        <Text style={styles.h3}>{hotel.name}</Text>
        {hotel.stars > 0 ? (
          <Text style={[styles.small, styles.accent]}>
            {"★".repeat(hotel.stars)}
          </Text>
        ) : null}

        {hotel.description ? (
          <Text style={{ ...styles.paragraph, marginTop: 6 }}>
            {hotel.description}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", marginTop: 6, gap: 12 }}>
          <Text style={styles.small}>
            {hotel.checkIn} → {hotel.checkOut}
          </Text>
          <Text style={styles.small}>{hotel.nights} noches</Text>
          {hotel.boardCode ? (
            <Text style={styles.small}>Régimen: {hotel.boardCode}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: 8, alignSelf: "flex-end" }}>
          {variant === "agent" ? (
            <>
              <Text style={styles.small}>
                Neto: {Math.round(hotel.netPrice)} {hotel.currency}/noche
              </Text>
              <Text style={{ ...styles.h3, color: branding.primaryColor }}>
                Total: {totalStay} {hotel.currency}
              </Text>
            </>
          ) : (
            <Text style={{ ...styles.h3, color: branding.primaryColor }}>
              {totalStay} {hotel.currency}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
