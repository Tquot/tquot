export type ProviderSearchParams = {
  hotelName: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: Array<{ adults: number; children?: number }>;
};

export type ProviderPriceResult = {
  netPrice: number;
  currency: string;
  rateKey?: string;
  meta?: Record<string, unknown>;
};
