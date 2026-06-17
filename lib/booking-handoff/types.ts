import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type { Quote, QuoteWithGroup } from "@/lib/quote-engine/types";

// ─── Configuración por agencia ──────────────────────────

export interface AgencyBookingConfig {
  agencyId: string;
  hotelbedsExtranetUrl: string;
  preferredAirlineSites: Record<string, string>;
  preferredHotelBookingSite?: string;
  defaultLocale: string;
}

// ─── Contexto pasado a cada estrategia ──────────────────

export interface HandoffContext {
  agencyConfig: AgencyBookingConfig;
  quote: Quote & QuoteWithGroup;
  parsed: ParsedTripInputV2;
}

// ─── Acciones que el botón puede ejecutar ───────────────

export type HandoffAction =
  | {
      kind: "open_url";
      url: string;
      label: string;
      openInNewTab: boolean;
    }
  | {
      kind: "copy_text";
      text: string;
      label: string;
      description: string;
    }
  | {
      kind: "render_form";
      fields: Array<{ name: string; value: string }>;
      label: string;
      targetUrl: string;
      method: "GET" | "POST";
    };

// ─── Resultado de una estrategia ────────────────────────

export interface BookingHandoff {
  itemId: string;
  provider: string;
  itemKind: "hotel" | "flight" | "experience" | "transfer";
  primary: HandoffAction;
  secondary: HandoffAction[];
  metadata?: {
    expiresAt?: string;
    [key: string]: unknown;
  };
}

// ─── Estrategia ─────────────────────────────────────────

export interface BookingHandoffStrategy<T = unknown> {
  provider: string;
  itemKind: BookingHandoff["itemKind"];
  buildHandoff(item: T, context: HandoffContext): BookingHandoff;
}
