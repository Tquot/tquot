"use client";

import { useCallback } from "react";
import {
  applyItemMargin,
  getItemMarginPercent,
  selectPrimaryInGroup,
  syncQuotePricing,
  toggleExperienceInQuote,
  toggleTransferInQuote,
  type ParsedTripInput,
  type Quote,
} from "@/lib/quotes/build-quote";
import type { HotelDetails } from "@/lib/quote-engine/types";
import type { ComparatorResultRow } from "@/lib/comparator";
import type { DashboardTranslation } from "../translations";
import {
  quoteItemToHotelDetails,
  type CompareHotelState,
} from "./quote-comparator";
import { cloneQuote, allQuoteItems } from "./quote-shared";

type UseQuoteItemHandlersParams = {
  quote: Quote | null;
  tripInput: ParsedTripInput | null;
  updateQuote: (quote: Quote) => void;
  setCompareHotel: (state: CompareHotelState) => void;
  compareHotel: CompareHotelState;
  t: DashboardTranslation;
};

export function useQuoteItemHandlers({
  quote,
  tripInput,
  updateQuote,
  setCompareHotel,
  compareHotel,
  t,
}: UseQuoteItemHandlersParams) {
  const handleSelectQuoteItem = useCallback(
    (itemId: string) => {
      if (!quote) return;
      const next = cloneQuote(quote);
      selectPrimaryInGroup(next, itemId);
      syncQuotePricing(next);
      updateQuote(next);
    },
    [quote, updateQuote],
  );

  const handleToggleExperienceItem = useCallback(
    (itemId: string) => {
      if (!quote) return;
      const next = cloneQuote(quote);
      toggleExperienceInQuote(next, itemId);
      syncQuotePricing(next);
      updateQuote(next);
    },
    [quote, updateQuote],
  );

  const handleToggleTransferItem = useCallback(
    (itemId: string) => {
      if (!quote) return;
      const next = cloneQuote(quote);
      toggleTransferInQuote(next, itemId);
      syncQuotePricing(next);
      updateQuote(next);
    },
    [quote, updateQuote],
  );

  const handleQuoteItemMarginChange = useCallback(
    (itemId: string, marginPercent: number) => {
      if (!quote) return;
      const next = cloneQuote(quote);
      const item = allQuoteItems(next).find((entry) => entry.id === itemId);
      if (!item) return;
      applyItemMargin(item, marginPercent);
      syncQuotePricing(next);
      updateQuote(next);
    },
    [quote, updateQuote],
  );

  const handleFlightFareSelect = useCallback(
    (itemId: string, offerId: string) => {
      if (!quote) return;
      const next = cloneQuote(quote);
      const item = next.flights.find((entry) => entry.id === itemId);
      const details = item?.flightDetails;
      if (!item || !details) return;

      if (details.primaryOfferId && offerId === details.primaryOfferId) {
        details.selectedOfferId = details.primaryOfferId;
        details.priceNumeric = details.primaryPriceNumeric ?? details.priceNumeric;
        details.cabinClass = details.primaryCabinClass ?? details.cabinClass;
        details.baggageIncluded =
          details.primaryBaggageIncluded ?? details.baggageIncluded;
        if (details.primaryFareName) {
          details.fareName = details.primaryFareName;
        }
      } else {
        const fare = details.fareOptions?.find((entry) => entry.offerId === offerId);
        if (!fare) return;
        details.selectedOfferId = fare.offerId;
        details.priceNumeric = fare.priceNumeric;
        details.cabinClass = fare.cabinClass;
        details.baggageIncluded = fare.baggageIncluded;
        details.fareName = fare.fareName;
      }

      const basePrice =
        details.priceNumeric > 0 ? details.priceNumeric : item.price;
      item.price = basePrice;
      applyItemMargin(item, getItemMarginPercent(item));
      syncQuotePricing(next);
      updateQuote(next);
    },
    [quote, updateQuote],
  );

  const handleCompareHotel = useCallback(
    (itemId: string) => {
      if (!quote) return;
      const item = quote.hotels.find((entry) => entry.id === itemId);
      if (!item) return;
      const hotel = quoteItemToHotelDetails(item);
      if (!hotel) return;
      setCompareHotel({ itemId, hotel });
    },
    [quote, setCompareHotel],
  );

  const handleSelectComparatorPrice = useCallback(
    (_row: ComparatorResultRow) => {
      // Price selection is handled via explicit refresh in HotelCompareModal.
      if (!compareHotel) return;
      setCompareHotel(null);
    },
    [compareHotel, setCompareHotel],
  );

  const handleHotelRefreshed = useCallback(
    (refreshed: HotelDetails) => {
      if (!compareHotel || !quote) return;
      const next = cloneQuote(quote);
      const item = next.hotels.find((entry) => entry.id === compareHotel.itemId);
      if (!item) return;

      item.price = refreshed.netPrice;
      item.hotelDetails = {
        ...item.hotelDetails,
        netPrice: refreshed.netPrice,
        rateKey: refreshed.rateKey,
        fetchedAt: refreshed.fetchedAt,
        currency: refreshed.currency,
        provider: refreshed.provider,
      };
      applyItemMargin(item, getItemMarginPercent(item));
      syncQuotePricing(next);
      updateQuote(next);
      setCompareHotel({ itemId: compareHotel.itemId, hotel: refreshed });
    },
    [compareHotel, quote, updateQuote, setCompareHotel],
  );

  return {
    handleSelectQuoteItem,
    handleToggleExperienceItem,
    handleToggleTransferItem,
    handleQuoteItemMarginChange,
    handleFlightFareSelect,
    handleCompareHotel,
    handleSelectComparatorPrice,
    handleHotelRefreshed,
  };
}
