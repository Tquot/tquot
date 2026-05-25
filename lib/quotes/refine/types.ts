import type { HotelLevel, ParsedTripInput, Quote, QuoteItem, QuoteMeta } from "@/lib/quotes/build-quote";

export type RefineAction =
  | {
      action: "add_insurance";
      params: { destination: string; days: number; pax: number };
    }
  | {
      action: "change_hotel_level";
      params: {
        level?: HotelLevel;
        area?: string;
        preference?: string;
      };
    }
  | { action: "filter_direct_flights" }
  | { action: "cheaper" }
  | { action: "add_experience"; params: { type: string } }
  | { action: "search_web"; params: { query: string } }
  | { action: "explain"; params: { text: string } }
  | { action: "unknown"; params: { text: string } };

export type RefineQuotePatch = {
  hotels?: QuoteItem[];
  experiences?: QuoteItem[];
  flights?: QuoteItem[];
  _meta?: Partial<QuoteMeta>;
};

export type RefineApplyResult = {
  message: string;
  patch?: RefineQuotePatch;
  suggestion?: string;
  updatedTripInput?: ParsedTripInput;
};

export type RefineClassifyRequest = {
  currentQuote: Quote;
  message: string;
  tripInput: ParsedTripInput;
  agentId: string;
};

export type RefineApplyRequest = {
  action: RefineAction;
  currentQuote: Quote;
  tripInput: ParsedTripInput;
  agentId: string;
};
