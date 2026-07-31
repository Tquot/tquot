import type { BoardCode } from "@/lib/quote-engine/types";

export type AgentMessageKind =
  | "ack"
  | "probe"
  | "finding"
  | "suggestion"
  | "close"
  | "revision_ack"
  | "blocker";

export const MAX_CHARS: Record<AgentMessageKind, number> = {
  ack: 90,
  probe: 120,
  finding: 100,
  suggestion: 110,
  close: 240,
  revision_ack: 80,
  blocker: 120,
};

export type QuotePatch =
  | { type: "selectFlight"; flightId: string }
  | { type: "selectHotel"; hotelId: string }
  | { type: "setBoard"; hotelId: string; boardCode: BoardCode | string }
  | { type: "addInsurance"; tier: "basic" | "standard" | "premium" }
  | { type: "addTransfer"; transferId: string }
  | { type: "switchProvider"; hotelId: string; provider: string }
  | { type: "dismissSuggestion"; id: string };

export interface AgentAction {
  id: string;
  label: string;
  patch: QuotePatch;
  variant?: "primary" | "ghost";
}

export interface AgentMessage {
  id: string;
  kind: AgentMessageKind;
  text: string;
  actions?: AgentAction[];
  suggestionId?: string;
  /** Full suggestion payload for SSE / chat actions. */
  suggestion?: import("./suggestions/types").Suggestion;
  createdAt: string;
}

export type RevisionKind =
  | "nights"
  | "dates"
  | "pax"
  | "destination"
  | "board"
  | "category"
  | "budget"
  | "remove_section"
  | "add_section"
  | "swap_selection";

export interface CloseFacts {
  totalPrice: number;
  currency: string;
  pax: number;
  topHotel?: { name: string; netPrice: number };
  topFlight?: { carrier: string; price: number };
  notes: string[];
}
