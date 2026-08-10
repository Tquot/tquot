import type { Flight, Hotel } from "@/lib/quote-engine/types";
import type { Itinerary } from "@/lib/itinerary/types";
import type { Recommendation } from "@/lib/recommendations/types";
import type { ProviderBlock } from "@/lib/recommendations/providers/types";
import type { QuoteGroup } from "@/lib/quote-engine/types";

export interface PremiumPdfHotel extends Hotel {
  checkIn: string;
  checkOut: string;
  destination?: string;
}

export interface PremiumPdfFlight extends Flight {
  departureDate?: string;
  name?: string;
  airlineLogoUrl?: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  stops?: number;
  cabinClass?: string;
  fareName?: string;
  baggageIncluded?: string;
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
    accessibility?: import("@/lib/accessibility/types").AccessibilityInfo<
      import("@/lib/accessibility/types").ExperienceFeatures
    >;
  }>;
  transfers: Array<{
    id: string;
    name: string;
    description?: string;
    destination?: string;
    price: number;
    currency: string;
    accessibility?: import("@/lib/accessibility/types").AccessibilityInfo<
      import("@/lib/accessibility/types").TransferFeatures
    >;
  }>;
  pricing: {
    baseTotal: number;
    margin: number;
    finalTotal: number;
    currency: string;
  };
  recommendations?: Recommendation[];
  externalProviders?: ProviderBlock[];
  itinerary?: Itinerary;
  group?: QuoteGroup;
}
