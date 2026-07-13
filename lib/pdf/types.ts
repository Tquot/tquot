/**
 * Tipos del dominio de cotización que consumen los PDFs.
 *
 * IMPORTANTE: estos tipos deben coincidir con los que ya tienes en TQuot.
 * Si tu modelo tiene nombres distintos, ajusta los mappers en utils/map-quote.ts
 * en lugar de tocar este archivo o las plantillas.
 */

import type { PriceSource } from "./theme";
import type { Recommendation } from "@/lib/recommendations/types";
import type { HotelContent } from "@/lib/providers/hotelbeds/content-types";

// ─────────────────────────────────────────────────────────────
// Agencia
// ─────────────────────────────────────────────────────────────

export interface Agency {
  id: string;
  name: string;
  logoUrl: string | null;        // URL pública de Supabase Storage
  legalName: string;
  taxId: string;                  // CIF / NIF
  address: string;
  phone: string;
  email: string;
  website: string | null;
  legalDisclaimer?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Cliente
// ─────────────────────────────────────────────────────────────

export interface QuoteClient {
  fullName: string;
  email: string | null;
  phone: string | null;
  reference: string | null;       // referencia interna del agente
}

// ─────────────────────────────────────────────────────────────
// Líneas de coste con desglose
// ─────────────────────────────────────────────────────────────

export interface QuoteLineItem {
  id: string;
  category: "flight" | "hotel" | "transfer" | "activity" | "insurance" | "other";
  description: string;            // "Vuelo MAD-FCO ida y vuelta, Iberia"
  subtitle?: string | null;       // "Clase turista, equipaje 23kg incluido"

  // Coste
  netCost: number;                // coste real para la agencia
  margin: number;                 // margen aplicado
  marginPercent: number;          // % de margen sobre neto
  publicPrice: number;            // precio al cliente = neto + margen

  // Solo PDF agente
  source: PriceSource;            // INV_PROPIO | CORPORATIVO | WEB
  internalNotes?: string | null;  // "Negociado con rate manager el 12/05"
  supplier?: string | null;       // "Hotelbeds", "Iberia GDS"

  // Detalle por viajero (si aplica)
  perPerson: boolean;
  paxCount: number;

  /** Código Hotelbeds para rehidratar content en PDF. */
  hotelCode?: string | null;
  /** Snapshot opcional de Content API (o rellenado al cargar desde caché). */
  hotelContent?: HotelContent | null;
}

// ─────────────────────────────────────────────────────────────
// Cotización completa
// ─────────────────────────────────────────────────────────────

export interface Quote {
  id: string;
  reference: string;              // "TQ-2026-0042"
  createdAt: string;              // ISO date
  validUntil: string;             // ISO date - cotización válida hasta

  agency: Agency;
  agent: {
    name: string;
    email: string;
  };
  client: QuoteClient;

  // Resumen del viaje
  trip: {
    origin: string;               // "Madrid"
    destination: string;          // "Roma, Italia"
    departureDate: string;        // ISO date
    returnDate: string;           // ISO date
    nights: number;
    adults: number;
    children: number;
    infants: number;
    purpose: string;              // "Luna de miel", "Viaje de placer"
  };

  // Líneas de coste
  lineItems: QuoteLineItem[];

  // Totales (calculados, pero los pasamos pre-calculados para evitar discrepancias)
  totals: {
    netCost: number;
    margin: number;
    marginPercent: number;
    publicPrice: number;
    currency: "EUR" | "USD" | "GBP" | string;
  };

  // Notas
  agentNotes?: string | null;     // Solo PDF agente
  clientMessage?: string | null;  // Mensaje personal del agente al cliente, va en PDF cliente

  // Condiciones
  paymentTerms?: string | null;
  cancellationPolicy?: string | null;

  recommendations?: Recommendation[];
}

// ─────────────────────────────────────────────────────────────
// Variante de PDF
// ─────────────────────────────────────────────────────────────

export type PdfVariant = "agent" | "client";
