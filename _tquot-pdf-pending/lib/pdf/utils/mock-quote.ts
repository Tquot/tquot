/**
 * Mock de Quote para previsualizar los PDFs sin pegar a Supabase.
 *
 * Uso: ver scripts/preview-pdfs.ts
 */

import type { Quote } from "../types";

export const mockQuote: Quote = {
  id: "demo-quote-id",
  reference: "TQ-2026-0042",
  createdAt: "2026-05-17T10:00:00Z",
  validUntil: "2026-05-31T23:59:59Z",

  agency: {
    id: "demo-agency",
    name: "Atrium Voyages",
    logoUrl: null, // probará el fallback de wordmark
    legalName: "Atrium Voyages, S.L.",
    taxId: "B-12345678",
    address: "Calle Serrano 41, 28001 Madrid",
    phone: "+34 910 000 000",
    email: "contacto@atrium.example",
    website: "atrium.example",
    legalDisclaimer: null,
  },

  agent: {
    name: "Lucía Hernández",
    email: "lucia@atrium.example",
  },

  client: {
    fullName: "Familia Ortega-Pérez",
    email: "marina.ortega@example.com",
    phone: "+34 600 123 456",
    reference: "CL-887",
  },

  trip: {
    origin: "Madrid",
    destination: "Roma · Florencia",
    departureDate: "2026-07-12",
    returnDate: "2026-07-19",
    nights: 7,
    adults: 2,
    children: 2,
    infants: 0,
    purpose: "Viaje familiar - aniversario",
  },

  lineItems: [
    {
      id: "li-1",
      category: "flight",
      description: "Vuelo Madrid (MAD) → Roma (FCO), ida y vuelta",
      subtitle: "Iberia · Vuelo directo · Equipaje 23kg incluido · Selección de asiento",
      netCost: 1280,
      margin: 220,
      marginPercent: 17.2,
      publicPrice: 1500,
      source: "CORPORATIVO",
      internalNotes: "Tarifa corporativa Iberia Q3 2026. Negociada el 03/05 con account manager.",
      supplier: "Iberia GDS",
      perPerson: false,
      paxCount: 4,
    },
    {
      id: "li-2",
      category: "hotel",
      description: "Hotel de la Minerva, Roma — 4 noches",
      subtitle: "Suite familiar con vistas al Panteón · Desayuno buffet incluido · 5★",
      netCost: 2100,
      margin: 540,
      marginPercent: 25.7,
      publicPrice: 2640,
      source: "INV_PROPIO",
      internalNotes: "Allotment propio Q3. Confirmar última habitación con front desk si demoramos > 48h.",
      supplier: "Direct contract",
      perPerson: false,
      paxCount: 4,
    },
    {
      id: "li-3",
      category: "hotel",
      description: "Hotel Brunelleschi, Florencia — 3 noches",
      subtitle: "Habitaciones comunicadas · Desayuno incluido · 4★ histórico",
      netCost: 1380,
      margin: 360,
      marginPercent: 26.1,
      publicPrice: 1740,
      source: "WEB",
      internalNotes: null,
      supplier: "Booking.com Partner Rate",
      perPerson: false,
      paxCount: 4,
    },
    {
      id: "li-4",
      category: "transfer",
      description: "Tren Roma → Florencia, alta velocidad",
      subtitle: "Frecciarossa · 1ª clase · Reserva de asientos contiguos",
      netCost: 320,
      margin: 80,
      marginPercent: 25.0,
      publicPrice: 400,
      source: "WEB",
      internalNotes: null,
      supplier: "Trenitalia",
      perPerson: true,
      paxCount: 4,
    },
    {
      id: "li-5",
      category: "activity",
      description: "Visita guiada Vaticano y Capilla Sixtina",
      subtitle: "Sin colas · Guía en español · Duración 3h · Grupo reducido",
      netCost: 280,
      margin: 120,
      marginPercent: 42.9,
      publicPrice: 400,
      source: "INV_PROPIO",
      internalNotes: "Confirmar grupo reducido (max 8 pax) en operativa.",
      supplier: "City Wonders",
      perPerson: true,
      paxCount: 4,
    },
  ],

  totals: {
    netCost: 5360,
    margin: 1320,
    marginPercent: 24.6,
    publicPrice: 6680,
    currency: "EUR",
  },

  agentNotes:
    "Cliente histórico (3ª reserva). Prefieren llegar al hotel antes de las 14:00. Marina tiene intolerancia al gluten - avisar a hoteles. Ofrecer upgrade a suite si está disponible al check-in en Roma.",

  clientMessage:
    "Estimada familia Ortega-Pérez, después de nuestra conversación he diseñado una propuesta pensada para que disfruten tanto del bullicio de Roma como de la calma de Florencia. He seleccionado alojamientos con habitaciones comunicadas para que los niños tengan su espacio sin perder la cercanía con vosotros. Cualquier ajuste, lo conversamos.",

  paymentTerms:
    "30% de señal al confirmar la reserva. Resto 30 días antes de la salida. Pago por transferencia bancaria o tarjeta.",
  cancellationPolicy:
    "Hasta 45 días antes: cancelación sin coste (excepto vuelos según tarifa). Entre 44 y 15 días: 50% del importe total. Menos de 15 días: 100%. Recomendamos contratar seguro de cancelación.",
};
