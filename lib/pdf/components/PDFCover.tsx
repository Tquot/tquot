import { View, Text, Image } from "@react-pdf/renderer";
import type { AgencyBranding } from "@/lib/branding/types";
import type { PremiumPdfQuote } from "../premium-types";

interface Props {
  quote: PremiumPdfQuote;
  branding: AgencyBranding;
  styles: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any;
}

export function PDFCover({ quote, branding, styles }: Props) {
  const destination =
    quote.hotels[0]?.destination ??
    quote.flights[0]?.destination ??
    "Tu próximo viaje";
  const heroImage = branding.coverImageUrl ?? quote.hotels[0]?.imageUrl;
  const firstCheckIn = quote.hotels[0]?.checkIn;
  const lastCheckOut = quote.hotels[quote.hotels.length - 1]?.checkOut;

  return (
    <View style={{ flex: 1, position: "relative" }}>
      {heroImage ? (
        <Image
          src={heroImage}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          } as const}
        />
      ) : null}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.45)",
        }}
      />
      <View
        style={{
          flex: 1,
          padding: 48,
          justifyContent: "space-between",
          color: "#ffffff",
        }}
      >
        {branding.logoUrl ? (
          <Image
            src={branding.logoUrl}
            style={{ width: 100, height: 40, objectFit: "contain" }}
          />
        ) : null}
        <View>
          <Text
            style={{
              fontSize: 14,
              opacity: 0.8,
              marginBottom: 8,
              color: "#ffffff",
            }}
          >
            Cotización personalizada
          </Text>
          <Text style={{ fontSize: 36, fontWeight: "bold", color: "#ffffff" }}>
            {destination}
          </Text>
          {firstCheckIn && lastCheckOut ? (
            <Text style={{ fontSize: 14, marginTop: 12, color: "#ffffff" }}>
              {firstCheckIn} — {lastCheckOut}
            </Text>
          ) : null}
        </View>
        <View>
          <Text style={{ fontSize: 9, color: "#ffffff", opacity: 0.9 }}>
            {branding.agencyLegalName ?? ""}
          </Text>
          <Text style={{ fontSize: 8, color: "#ffffff", opacity: 0.75 }}>
            {[branding.agencyEmail, branding.agencyPhone]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      </View>
    </View>
  );
}
