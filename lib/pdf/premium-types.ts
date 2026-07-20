import type { Flight, Hotel } from "@/lib/quote-engine/types";
import type { Itinerary } from "@/lib/itinerary/types";
import type { Recommendation } from "@/lib/recommendations/types";
import type { QuoteGroup } from "@/lib/quote-engine/types";

export interface PremiumPdfHotel extends Hotel {
  checkIn: string;
  checkOut: string;
  destination?: string;
}

export interface PremiumPdfFlight extends Flight {
  departureDate?: string;
  name?: string;
}

export interface PremiumPdfQuote {
  id: string;
  hotels: PremiumPdfHotel[];
  flights: PremiumPdfFlight[];
  experiences: Array<{
    id: string;
    name: string;
    destination?: string;
    duration?: string;
    price: number;
    currency: string;
  }>;
  transfers: Array<{
    id: string;
    name: string;
    description?: string;
    destination?: string;
    price: number;
    currency: string;
  }>;
  pricing: {
    baseTotal: number;
    margin: number;
    finalTotal: number;
    currency: string;
  };
  recommendations?: Recommendation[];
  itinerary?: Itinerary;
  group?: QuoteGroup;
}
