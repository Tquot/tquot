export interface AgencyBranding {
  agencyId: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  accentColor: string;
  logoUrl?: string;
  fontFamily: string;
  coverImageUrl?: string;
  agencyLegalName?: string;
  agencyPhone?: string;
  agencyEmail?: string;
  agencyWebsite?: string;
  agencyAddress?: string;
  pdfFooterText?: string;
}

export { mapAgencyBranding } from "./map";
