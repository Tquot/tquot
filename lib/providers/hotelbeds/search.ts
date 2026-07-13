/**
 * Thin integration point for Hotelbeds search post-processing.
 * Availability search lives in the connector + API route;
 * boardOptions are parsed in app/api/search-hotels-hotelbeds via parseBoardOptionsFromRooms.
 * This module re-exports content enrichment used after search.
 */
export {
  enrichWithContent,
  enrichHotelOptionsWithContent,
  enrichHotelOptionsWithContentBounded,
} from "./content-enrich";

export { parseBoardOptions, parseBoardOptionsFromRooms } from "./parse-board-options";
