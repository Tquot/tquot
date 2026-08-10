import type { Locale } from "@/app/dashboard/translations";
import type { ComparatorEntry } from "@/lib/comparator/types";
import type { ParsedTripInputV2 } from "@/lib/quote-engine/schemas-v2";
import type {
  Experience,
  Flight,
  Hotel,
  Transfer,
} from "@/lib/quote-engine/types";
import type { Quote } from "@/lib/quotes/build-quote";
import type { AgentAction } from "@/lib/agent/types";

export type SuggestionKind =
  | "directFlightUpgrade"
  | "refundableUpgrade"
  | "boardUpgrade"
  | "insuranceMissing"
  | "transferGap"
  | "budgetOvershoot"
  | "budgetHeadroom"
  | "experienceGap"
  | "longLayover"
  | "cancellationDeadlineTight"
  | "childAgeRateRisk"
  | "comparatorCheaperElsewhere";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  /** 1 = el agente perdería dinero o credibilidad si no lo ve. 3 = detalle útil. */
  priority: 1 | 2 | 3;
  text: string;
  actions: AgentAction[];
  /** Impacto en el total, en la moneda de la cotización. Negativo = ahorro. */
  delta?: number;
  /**
   * Metadatos opcionales para analytics/telemetría.
   * Se usa en UI para persistir eventos relevantes sin acoplarlo a la conversación.
   */
  analytics?: {
    comparatorRun?: ComparatorRunAnalytics;
  };
  /** Si true, se muestra durante el build. Si false, espera al cierre. */
  interrupts: boolean;
}

export type ComparatorRunAnalyticsEntry = {
  provider: string;
  total_price: number;
  available: boolean;
  source: "snapshot" | "live";
};

export type ComparatorRunAnalytics = {
  quote_id?: string | null;
  hotel_name: string;
  nights: number;
  entries: ComparatorRunAnalyticsEntry[];
  chosen_provider: string;
  chosen_total: number;
};

export interface SuggestionContext {
  quote: Quote;
  parsed: ParsedTripInputV2;
  /** Todas las opciones devueltas por proveedores, no solo las elegidas */
  candidates: {
    flights: Flight[];
    hotels: Hotel[];
    experiences: Experience[];
    transfers: Transfer[];
  };
  comparator?: ComparatorEntry[];
  agency: {
    accessibilityDefault: boolean;
    defaultMarginPct: number;
  };
  /** Sugerencias ya descartadas en esta cotización, por id */
  dismissed: string[];
  /** UI / agent copy locale. Defaults to `"es"` when omitted. */
  locale?: Locale;
}

export type Detector = (ctx: SuggestionContext) => Suggestion | null;
