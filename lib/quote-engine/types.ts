export * from "@/lib/quote-conversation/types";
export type { Quote } from "@/lib/quotes/build-quote";

export interface Hotel {
  id: string;
  legId: string;
  name: string;
  netPrice: number;
  currency: string;
  nights: number;
  stars: number;
  provider: "hotelbeds" | "booking" | "own";
  fetchedAt: string;
  hotelCode?: string;
  rateKey?: string;
  totalForGroup?: number;
}

export interface Flight {
  id: string;
  legId: string;
  carrier: string;
  carrierName?: string;
  price: number;
  currency: string;
  origin?: string;
  destination?: string;
  offerId?: string;
  locator?: string;
  slices?: Array<{
    departureDate: string;
    segments: Array<{
      origin: { iata_code: string };
      destination: { iata_code: string };
      flightNumber?: string;
      departureTime?: string;
    }>;
  }>;
}

export interface QuoteGroupDistribution {
  doubles: number;
  singles: number;
  triples: number;
  totalRooms: number;
}

export interface QuoteGroup {
  distribution: QuoteGroupDistribution;
}

export interface QuoteWithGroup {
  group?: QuoteGroup;
}
