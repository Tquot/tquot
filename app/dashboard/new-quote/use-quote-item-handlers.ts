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
import { persistQuoteSnapshotMutation } from "@/lib/versioning/persist-mutation";
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
  /** When set, board/refresh mutations also version + update quotes.snapshot. */
  persistedQuoteId?: string | null;
};

async function versionIfPersisted(
  quoteId: string | null | undefined,
  newSnapshot: Quote,
  changeKind: "board_change" | "snapshot_refresh",
  changeSummary: string,
) {
  if (!quoteId) return;
  try {
    await persistQuoteSnapshotMutation({
      quoteId,
      newSnapshot,
      changeKind,
      changeSummary,
    });
  } catch (error) {
    console.error("[versionIfPersisted]", changeKind, error);
  }
}

export function useQuoteItemHandlers({
  quote,
  updateQuote,
  setCompareHotel,
  compareHotel,
  persistedQuoteId,
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
      void versionIfPersisted(
        persistedQuoteId,
        next,
        "snapshot_refresh",
        `Refresco de precio: ${item.title}`,
      );
    },
    [compareHotel, quote, updateQuote, setCompareHotel, persistedQuoteId],
  );

  const handleHotelBoardChange = useCallback(
    (
      itemId: string,
      update: {
        boardCode: string;
        totalPrice: number;
        rateKey?: string;
        currency: string;
        fetchedAt: string;
      },
    ) => {
      if (!quote) return;
      const next = cloneQuote(quote);
      const item = next.hotels.find((entry) => entry.id === itemId);
      if (!item) return;

      item.price = update.totalPrice;
      item.hotelDetails = {
        ...item.hotelDetails,
        boardCode: update.boardCode,
        netPrice: update.totalPrice,
        rateKey: update.rateKey ?? item.hotelDetails?.rateKey,
        currency: update.currency,
        fetchedAt: update.fetchedAt,
      };
      applyItemMargin(item, getItemMarginPercent(item));
      syncQuotePricing(next);
      updateQuote(next);
      void versionIfPersisted(
        persistedQuoteId,
        next,
        "board_change",
        `Cambio de régimen a ${update.boardCode}: ${item.title}`,
      );
    },
    [quote, updateQuote, persistedQuoteId],
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
    handleHotelBoardChange,
  };
}
