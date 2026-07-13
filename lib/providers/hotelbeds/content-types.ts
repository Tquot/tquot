export interface HotelImage {
  url: string;
  type:
    | "main"
    | "room"
    | "pool"
    | "restaurant"
    | "gym"
    | "spa"
    | "beach"
    | "lobby"
    | "other";
  order?: number;
}

export interface HotelFacility {
  code: number;
  group: number;
  description: string;
  number?: number;
  ageFrom?: number;
  ageTo?: number;
  voucher: boolean;
}

export interface CancellationPolicy {
  amount: number;
  currency: string;
  from: string;
  description?: string;
}

export interface HotelContent {
  hotelCode: string;
  name: string;
  descriptionShort?: string;
  descriptionLong?: string;
  categoryCode?: string;
  categoryLabel?: string;
  zoneName?: string;
  destinationName?: string;
  countryCode?: string;
  coordinates?: { lat: number; lng: number };
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  images: HotelImage[];
  facilities: HotelFacility[];
  cancellationPolicies: CancellationPolicy[];
  fetchedAt: string;
}
