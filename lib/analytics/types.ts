export interface AgencyAnalytics {
  range: { from: string; to: string; days: number };
  quotes: { count: number; prev_count: number; delta_pct: number | null };
  volume: {
    quoted: number;
    won: number;
    margin_won: number;
    avg_ticket: number;
    prev_quoted: number;
    delta_pct: number | null;
  };
  conversion: {
    won: number;
    decidable: number;
    rate_pct: number | null;
    prev_rate_pct: number | null;
  };
  funnel: {
    draft: number;
    awaiting: number;
    won: number;
    expired: number;
    cancelled: number;
  };
  active_clients: number;
  comparator: { runs: number; total_quotes: number; saving: number; basis: string };
  daily: Array<{ day: string; quotes: number; volume: number }>;
  destinations: Array<{
    name: string;
    quotes: number;
    volume: number;
    won: number;
    decidable: number;
    conversion_pct: number | null;
  }>;
  providers: Array<{
    name: string;
    appearances: number;
    chosen: number;
    win_rate_pct: number;
  }>;
}

export type RangePreset = "7d" | "30d" | "90d" | "ytd" | "month" | "prev_month";

