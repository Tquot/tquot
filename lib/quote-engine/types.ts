export * from "@/lib/quote-conversation/types";
import type { Recommendation } from "@/lib/recommendations/types";
import type { Quote as BuildQuote } from "@/lib/quotes/build-quote";

export type Quote = BuildQuote &
  QuoteWithGroup & {
    recommendations?: Recommendation[];
  };

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
  imageUrl?: string;
  description?: string;
  /** Hotelbeds Content API payload (descripciones, facilities, imágenes). */
  content?: import("@/lib/providers/hotelbeds/content-types").HotelContent;
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
  isCorporate?: boolean;
  totalPax?: number;
  mice?: import("./group/types").MICERequirements;
  detection?: import("./group/types").GroupDetection;
}

export interface QuoteWithGroup {
  group?: QuoteGroup;
}

export interface Experience {
  id: string;
  legId: string;
  name: string;
  price: number;
  currency: string;
  provider?: string;
}

export interface Transfer {
  id: string;
  legId: string;
  price: number;
  currency: string;
  provider?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
}
