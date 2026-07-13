export interface QuoteShare {
  id: string;
  quoteId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  viewCount: number;
  lastViewedAt?: string;
}

export interface ShareCreateInput {
  quoteId: string;
  /** Default 30. */
  ttlDays: number;
}
