import type { Quote, QuoteItem } from "@/lib/quotes/build-quote";
import { syncQuotePricing } from "@/lib/quotes/build-quote";
import type { BoardOption } from "@/lib/quote-engine/types";
import { getRate } from "./rates";
import type { ConvertedMoney, Money } from "./types";

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function convertMoney(
  input: Money,
  targetCurrency: string,
): Promise<ConvertedMoney> {
  const from = input.currency.toUpperCase();
  const to = targetCurrency.toUpperCase();

  if (from === to) {
    return {
      original: { amount: input.amount, currency: from },
      converted: { amount: input.amount, currency: to },
      rate: 1,
      rateAt: new Date().toISOString(),
    };
  }

  const rate = await getRate(from, to);
  return {
    original: { amount: input.amount, currency: from },
    converted: { amount: round(input.amount * rate), currency: to },
    rate,
    rateAt: new Date().toISOString(),
  };
}

async function convertBoardOptions(
  options: BoardOption[] | undefined,
  fromCurrency: string,
  baseCurrency: string,
): Promise<BoardOption[] | undefined> {
  if (!options?.length) return options;
  if (fromCurrency.toUpperCase() === baseCurrency.toUpperCase()) return options;

  return Promise.all(
    options.map(async (b) => {
      const src = (b.currency || fromCurrency).toUpperCase();
      try {
        const c = await convertMoney(
          { amount: b.netPrice, currency: src },
          baseCurrency,
        );
        const t = await convertMoney(
          { amount: b.totalPrice, currency: src },
          baseCurrency,
        );
        return {
          ...b,
          netPrice: c.converted.amount,
          totalPrice: t.converted.amount,
          currency: baseCurrency,
        };
      } catch {
        return b;
      }
    }),
  );
}

/**
 * Convierte un QuoteItem a moneda base. Si falla el tipo de cambio, deja el
 * item intacto (degradación: precio original sin conversión).
 */
export async function convertQuoteItem(
  item: QuoteItem,
  baseCurrency: string,
): Promise<QuoteItem> {
  const base = baseCurrency.toUpperCase();
  const from = (
    item.currency ??
    item.hotelDetails?.currency ??
    "EUR"
  ).toUpperCase();

  if (from === base) {
    return {
      ...item,
      currency: base,
      hotelDetails: item.hotelDetails
        ? { ...item.hotelDetails, currency: base }
        : item.hotelDetails,
    };
  }

  try {
    const priceConv = await convertMoney(
      { amount: item.price, currency: from },
      base,
    );
    const markupConv = await convertMoney(
      { amount: item.markup, currency: from },
      base,
    );
    const finalConv = await convertMoney(
      { amount: item.finalPrice, currency: from },
      base,
    );

    const boardOptions = await convertBoardOptions(
      item.hotelDetails?.boardOptions,
      from,
      base,
    );

    let hotelDetails = item.hotelDetails;
    if (hotelDetails) {
      const net =
        hotelDetails.netPrice != null
          ? (
              await convertMoney(
                { amount: hotelDetails.netPrice, currency: from },
                base,
              )
            ).converted.amount
          : hotelDetails.netPrice;

      hotelDetails = {
        ...hotelDetails,
        netPrice: net,
        currency: base,
        boardOptions,
      };
    }

    return {
      ...item,
      price: priceConv.converted.amount,
      markup: markupConv.converted.amount,
      finalPrice: finalConv.converted.amount,
      currency: base,
      originalPrice: priceConv.original.amount,
      originalCurrency: from,
      exchangeRate: priceConv.rate,
      rateAt: priceConv.rateAt,
      hotelDetails,
    };
  } catch (err) {
    console.warn(
      "[convertQuoteItem] rate failed, keeping original currency",
      from,
      "→",
      base,
      err,
    );
    return {
      ...item,
      currency: from,
      originalPrice: item.price,
      originalCurrency: from,
    };
  }
}

/**
 * Convierte todos los precios de un Quote a la moneda de la agencia.
 */
export async function convertQuoteToBaseCurrency(
  quote: Quote,
  baseCurrency: string,
): Promise<Quote> {
  const base = baseCurrency.toUpperCase();

  const [flights, transfers, hotels, experiences] = await Promise.all([
    Promise.all(quote.flights.map((i) => convertQuoteItem(i, base))),
    Promise.all(quote.transfers.map((i) => convertQuoteItem(i, base))),
    Promise.all(quote.hotels.map((i) => convertQuoteItem(i, base))),
    Promise.all(quote.experiences.map((i) => convertQuoteItem(i, base))),
  ]);

  const converted: Quote = {
    ...quote,
    flights,
    transfers,
    hotels,
    experiences,
    pricing: {
      ...quote.pricing,
      currency: base,
    },
  };

  syncQuotePricing(converted);
  return converted;
}

/** Convierte un monto suelto (comparador, etc.) con degradación segura. */
export async function convertAmountSafe(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<{
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  rateAt?: string;
}> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) {
    return { amount, currency: to };
  }
  try {
    const conv = await convertMoney({ amount, currency: from }, to);
    return {
      amount: conv.converted.amount,
      currency: to,
      originalAmount: conv.original.amount,
      originalCurrency: from,
      exchangeRate: conv.rate,
      rateAt: conv.rateAt,
    };
  } catch {
    return { amount, currency: from };
  }
}
