export type MockInsuranceProduct = {
  id: string;
  name: string;
  provider: string;
  pricePerPerson: number;
  region: string;
  notes: string;
};

export const MOCK_INSURANCE_CATALOG: MockInsuranceProduct[] = [
  {
    id: "mock-ins-eu-basic",
    name: "Seguro viaje básico - Europa",
    provider: "World Nomads",
    pricePerPerson: 55,
    region: "europa",
    notes: "Cobertura Europa. Hasta 90 días. Asistencia 24h.",
  },
  {
    id: "mock-ins-world-basic",
    name: "Seguro viaje básico - Mundial",
    provider: "Mapfre Asistencia",
    pricePerPerson: 39,
    region: "mundial",
    notes: "Cobertura mundial. Hasta 90 días. Asistencia 24h.",
  },
  {
    id: "mock-ins-eu-full",
    name: "Seguro viaje completo - Europa",
    provider: "World Nomads",
    pricePerPerson: 50,
    region: "europa",
    notes: "Cobertura ampliada Europa.",
  },
  {
    id: "mock-ins-world-full",
    name: "Seguro viaje completo - Mundial",
    provider: "AXA Assistance",
    pricePerPerson: 66,
    region: "mundial",
    notes: "Cobertura ampliada mundial.",
  },
  {
    id: "mock-ins-cancel",
    name: "Seguro cancelación - Europa",
    provider: "Allianz Travel",
    pricePerPerson: 23,
    region: "europa",
    notes: "Cobertura por cancelación.",
  },
  {
    id: "mock-ins-medical",
    name: "Seguro médico premium - Mundial",
    provider: "World Nomads",
    pricePerPerson: 51,
    region: "mundial",
    notes: "Asistencia médica reforzada.",
  },
];

const AMERICAS_DESTINATIONS =
  /mexico|cancun|cancún|miami|new york|usa|estados unidos|caribe|cuba|argentina|brasil|america|américa/i;
const ASIA_DESTINATIONS =
  /japon|japón|tokyo|tokio|tailandia|thailand|bali|maldivas|maldives|asia|dubai|emiratos/i;

export function pickMockInsurance(destination: string): MockInsuranceProduct {
  if (AMERICAS_DESTINATIONS.test(destination)) {
    return (
      MOCK_INSURANCE_CATALOG.find((product) => product.id === "mock-ins-world-full") ??
      MOCK_INSURANCE_CATALOG[1]
    );
  }
  if (ASIA_DESTINATIONS.test(destination)) {
    return (
      MOCK_INSURANCE_CATALOG.find((product) => product.id === "mock-ins-medical") ??
      MOCK_INSURANCE_CATALOG[3]
    );
  }
  return (
    MOCK_INSURANCE_CATALOG.find((product) => product.id === "mock-ins-eu-basic") ??
    MOCK_INSURANCE_CATALOG[0]
  );
}
