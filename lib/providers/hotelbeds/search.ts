/**
 * Thin integration point for Block H (spec referenced lib/providers/hotelbeds/search.ts).
 * Actual Hotelbeds availability search lives in the connector + API route;
 * this module re-exports content enrichment used after search.
 */
export {
  enrichWithContent,
  enrichHotelOptionsWithContent,
  enrichHotelOptionsWithContentBounded,
} from "./content-enrich";
