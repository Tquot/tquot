import type { Quote } from "@/lib/quote-engine/types";

export type ChangeKind =
  | "initial"
  | "refinement"
  | "manual_edit"
  | "board_change"
  | "snapshot_refresh";

export interface QuoteVersion {
  id: string;
  quoteId: string;
  versionNumber: number;
  snapshot: Quote;
  changeSummary?: string;
  changeKind: ChangeKind;
  createdAt: string;
  createdBy?: string;
}
