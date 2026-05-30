export const PROVIDER_LOGO_DOMAINS: Record<string, string> = {
  hotelbeds: "hotelbeds.com",
  "hotelbeds-activities": "hotelbeds.com",
  "hotelbeds-transfers": "hotelbeds.com",
  booking: "booking.com",
  ratehawk: "ratehawk.com",
  w2m: "w2m.com",
  goglobal: "goglobal.com",
  duffel: "duffel.com",
  "smytravel-hotels": "smytravel.com",
  "traveltool-hotels": "traveltool.es",
  civitatis: "civitatis.com",
  viator: "viator.com",
  battleface: "battleface.com",
};

export function providerSlug(providerId: string | undefined): string {
  return (providerId ?? "").trim().toLowerCase();
}

export function getProviderClearbitLogoUrl(providerId: string): string | null {
  const domain = PROVIDER_LOGO_DOMAINS[providerSlug(providerId)];
  return domain ? `https://logo.clearbit.com/${domain}` : null;
}
