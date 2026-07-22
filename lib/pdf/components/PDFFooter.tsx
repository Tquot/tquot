import { View, Text } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { AgencyBranding } from "@/lib/branding/types";

interface Props {
  branding: AgencyBranding;
  styles: Record<string, Style>;
  pageLabel: string;
}

export function PDFFooter({ branding, styles, pageLabel }: Props) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 16,
        left: 32,
        right: 32,
        flexDirection: "row",
        justifyContent: "space-between",
        borderTop: `0.5pt solid ${branding.primaryColor}`,
        paddingTop: 4,
      }}
      fixed
    >
      <Text style={[styles.small, styles.primary]}>
        {branding.pdfFooterText ?? branding.agencyLegalName ?? ""}
      </Text>
      <Text style={styles.small}>{pageLabel}</Text>
      <Text
        style={styles.small}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}
