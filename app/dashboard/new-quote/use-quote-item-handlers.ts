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
import type { ComparatorResultRow } from "@/lib/comparator";
import type { DashboardTranslation } from "../translations";
import {
  cloneQuote,
  allQuoteItems,
} from "./quote-shared";
import {
  fetchHotelComparatorPanel,
  type ComparatorPanelState,
} from "./quote-comparator";

type UseQuoteItemHandlersParams = {
  quote: Quote | null;
  tripInput: ParsedTripInput | null;
  updateQuote: (quote: Quote) => void;
  setComparatorPanel: (panel: ComparatorPanelState | null) => void;
  comparatorPanel: ComparatorPanelState | null;
  t: DashboardTranslation;
};

export function useQuoteItemHandlers({
  quote,
  tripInput,
  updateQuote,
  setComparatorPanel,
  comparatorPanel,
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
    async (itemId: string) => {
      if (!quote || !tripInput) return;

      setComparatorPanel({
        itemId,
        loading: true,
        error: null,
        results: null,
        catalogProviders: [],
      });

      const panel = await fetchHotelComparatorPanel({
        quote,
        tripInput,
        itemId,
        t,
      });
      setComparatorPanel(panel);
    },
    [quote, tripInput, setComparatorPanel, t],
  );

  const handleSelectComparatorPrice = useCallback(
    (row: ComparatorResultRow) => {
      if (!comparatorPanel || !quote || row.status !== "ok" || !row.bestRoom) {
        return;
      }

      const next = cloneQuote(quote);
      const item = next.hotels.find((entry) => entry.id === comparatorPanel.itemId);
      if (!item) return;

      item.price = row.bestRoom.netPrice;
      item.provider = row.providerName;
      item.hotelDetails = {
        ...item.hotelDetails,
        providerId: row.providerId,
      };
      applyItemMargin(item, getItemMarginPercent(item));
      syncQuotePricing(next);
      updateQuote(next);
      setComparatorPanel(null);
    },
    [comparatorPanel, quote, updateQuote, setComparatorPanel],
  );

  return {
    handleSelectQuoteItem,
    handleToggleExperienceItem,
    handleToggleTransferItem,
    handleQuoteItemMarginChange,
    handleFlightFareSelect,
    handleCompareHotel,
    handleSelectComparatorPrice,
  };
}
