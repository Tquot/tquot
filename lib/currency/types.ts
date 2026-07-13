export type CurrencyCode = string; // ISO 4217: 'EUR', 'USD', 'GBP', …

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface ConvertedMoney {
  original: Money;
  converted: Money;
  rate: number;
  rateAt: string; // ISO timestamp
}

export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  fetchedAt: string;
  source: "api" | "manual" | "ecb" | "unity";
}

export const AGENCY_CURRENCY_OPTIONS = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "MXN",
  "ARS",
  "BRL",
  "JPY",
  "CNY",
  "AUD",
] as const;

export type AgencyCurrencyOption = (typeof AGENCY_CURRENCY_OPTIONS)[number];
