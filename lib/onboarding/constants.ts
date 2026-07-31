/** Client-safe onboarding constants (no server-only). */

export const DEMO_SUGGESTION =
  "Pareja a Roma 4 noches, zona Trastevere, hotel 4*, vuelo desde Madrid. Presupuesto 1500 €/persona.";

export type ProviderKey = "hotelbeds" | "duffel" | "booking";

export interface ProviderInfo {
  key: ProviderKey;
  name: string;
  category: string;
  description: string;
  recommended?: boolean;
  unlocks: string[];
  fields: Array<{
    key: string;
    label: string;
    type: "text" | "password";
    placeholder?: string;
  }>;
}

export const ONBOARDING_PROVIDERS: ProviderInfo[] = [
  {
    key: "hotelbeds",
    name: "Hotelbeds",
    category: "Hoteles · contenido · actividades · traslados",
    description:
      "Una sola alta cubre hoteles, fichas de contenido con fotos, actividades y traslados. Es el proveedor con el que TQuot rinde mejor.",
    recommended: true,
    unlocks: [
      "Comparador de netos",
      "Fotos y descripciones de hotel",
      "Regímenes SA/AD/MP/PC con precio",
    ],
    fields: [
      { key: "apiKey", label: "API Key", type: "text" },
      { key: "secret", label: "Secret", type: "password" },
    ],
  },
  {
    key: "duffel",
    name: "Duffel",
    category: "Vuelos",
    description:
      "Inventario de vuelos con tarifas en tiempo real. Si tu agencia solo cotiza alojamiento, sáltalo.",
    unlocks: ["Tabla de vuelos con horarios y escalas"],
    fields: [
      { key: "accessToken", label: "Access token", type: "password" },
    ],
  },
  {
    key: "booking",
    name: "Booking.com",
    category: "Hoteles · vía RapidAPI",
    description:
      "Útil como segunda fuente de hoteles para que el comparador tenga con qué comparar.",
    unlocks: ["Segunda línea en el comparador"],
    fields: [{ key: "apiKey", label: "RapidAPI key", type: "password" }],
  },
];

export const BRAND_COLOR_PRESETS = [
  { name: "Ink (default TQuot)", primary: "#1B2436", accent: "#B89446" },
  { name: "Navy", primary: "#1E3A5F", accent: "#C4A35A" },
  { name: "Forest", primary: "#1F3D2B", accent: "#C4783A" },
  { name: "Wine", primary: "#4A1C2F", accent: "#D4A574" },
  { name: "Slate", primary: "#2C333A", accent: "#7EB8A8" },
  { name: "Charcoal", primary: "#222222", accent: "#E8A87C" },
] as const;
