export interface Airport {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface CityResolution {
  cityKey: string;
  cityDisplayName: string;
  country: string;
  airports: Airport[]; // ordenados, principal primero
  isMultiAirport: boolean;
}
