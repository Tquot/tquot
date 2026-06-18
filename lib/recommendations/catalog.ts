export type ServiceCategory =
  | "insurance"
  | "travel_insurance"
  | "visa"
  | "sim"
  | "activities"
  | "tour_guide"
  | "transfers"
  | "restaurant"
  | "spa"
  | "train"
  | "car_rental";

export type ServiceScope = "global" | "per_destination";

export interface ServiceCatalogEntry {
  category: ServiceCategory;
  label: string;
  description: string;
  scope: ServiceScope;
  connectedProviders: string[];
  searchHint: string;
  requirements?: {
    minNights?: number;
    needsInternationalTravel?: boolean;
    onlyForGroup?: boolean;
    onlyForLongStay?: boolean;
    needsConnectivity?: boolean;
  };
}

export const SERVICE_CATALOG: ServiceCatalogEntry[] = [
  {
    category: "insurance",
    label: "Seguro de viaje",
    description: "Cobertura médica, cancelación, equipaje",
    scope: "global",
    connectedProviders: [],
    searchHint: "aseguradoras de viaje B2B con cobertura para agencias en España",
  },
  {
    category: "travel_insurance",
    label: "Seguro de viaje",
    description: "Cobertura médica, cancelación y equipaje para el viaje",
    scope: "global",
    connectedProviders: [],
    searchHint: "aseguradoras de viaje B2B con cobertura para agencias en España",
  },
  {
    category: "visa",
    label: "Tramitación de visado",
    description: "Servicios de gestión de visados para el destino",
    scope: "per_destination",
    connectedProviders: [],
    searchHint: "servicios profesionales de tramitación de visado para el país de destino",
    requirements: { needsInternationalTravel: true },
  },
  {
    category: "sim",
    label: "eSIM o tarjeta SIM",
    description: "Conectividad para el cliente durante el viaje",
    scope: "global",
    connectedProviders: [],
    searchHint: "proveedores de eSIM internacional con cobertura B2B",
    requirements: { needsConnectivity: true },
  },
  {
    category: "activities",
    label: "Actividades y excursiones",
    description:
      "Operadores locales de actividades, excursiones y tours en el destino",
    scope: "per_destination",
    connectedProviders: [],
    searchHint:
      "agencias de actividades y excursiones en el destino — operadores locales, touroperadores, empresas de excursiones",
  },
  {
    category: "tour_guide",
    label: "Guías locales",
    description: "Guías privados o agencias receptivas en el destino",
    scope: "per_destination",
    connectedProviders: [],
    searchHint:
      "guías privados acreditados o DMC (Destination Management Company) en el destino",
  },
  {
    category: "transfers",
    label: "Traslados",
    description: "Empresas de traslados privados aeropuerto-hotel en el destino",
    scope: "per_destination",
    connectedProviders: [],
    searchHint:
      "empresas de traslados privados y transfers aeropuerto-hotel con tarifas para agencias en el destino",
  },
  {
    category: "restaurant",
    label: "Restaurantes recomendados",
    description: "Lugares destacados para reservas en el destino",
    scope: "per_destination",
    connectedProviders: [],
    searchHint:
      "restaurantes destacados en el destino con reserva disponible (Michelin, Repsol, locales icónicos)",
  },
  {
    category: "spa",
    label: "Spa y bienestar",
    description: "Centros de spa o wellness en el destino",
    scope: "per_destination",
    connectedProviders: [],
    searchHint: "spas premium y centros de bienestar en el destino con reservas",
  },
  {
    category: "train",
    label: "Tren",
    description: "Operadores ferroviarios para conexiones inter-leg",
    scope: "per_destination",
    connectedProviders: [],
    searchHint: "operadores de tren para reservas profesionales en la zona del destino",
  },
  {
    category: "car_rental",
    label: "Alquiler de vehículo",
    description: "Operadores de rent-a-car con tarifas para agencias",
    scope: "per_destination",
    connectedProviders: [],
    searchHint: "compañías de alquiler de coches con programa para agencias de viajes",
  },
];

export function getEntry(category: ServiceCategory): ServiceCatalogEntry {
  const entry = SERVICE_CATALOG.find((e) => e.category === category);
  if (!entry) throw new Error(`unknown_category_${category}`);
  return entry;
}
