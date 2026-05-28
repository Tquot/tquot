/**
 * Registry de adaptadores.
 *
 * Mantiene un mapa { providerId → ProviderAdapter } y expone:
 * - getAdapter(providerId): obtener el adaptador de un proveedor
 * - listImplementedProviders(): saber qué proveedores están listos
 * - registerAdapter(adapter): registrar uno nuevo (uso interno)
 *
 * Los adaptadores se registran al cargar este módulo. Cada nuevo
 * proveedor implementado debe añadirse en `bootstrapAdapters` abajo.
 */

import type { ProviderAdapter } from "./types";

// ─── Adaptadores implementados ───
import { HotelbedsAdapter } from "./adapters/hotelbeds";
import { DuffelAdapter } from "./adapters/duffel";

// ─── Stubs (importados solo para que TypeScript valide su forma) ───
// Cuando un stub se implemente, mover su import arriba y registrarlo
// en bootstrapAdapters.
import { RatehawkAdapter } from "./adapters/ratehawk";
import { W2MAdapter } from "./adapters/w2m";
import { GoglobalAdapter } from "./adapters/goglobal";
import { HotelspointAdapter } from "./adapters/hotelspoint";
import { TravelmasterAdapter } from "./adapters/travelmaster";
import { SixToursAdapter } from "./adapters/6tours";
import { SmytravelAdapter } from "./adapters/smytravel";
import { TraveltoolAdapter } from "./adapters/traveltool";
import { AmadeusAdapter } from "./adapters/amadeus";
import { CivitatisAdapter } from "./adapters/civitatis";
import { GetyourguideAdapter } from "./adapters/getyourguide";

// ─────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────

const registry = new Map<string, ProviderAdapter>();

function bootstrapAdapters() {
  // SOLO registrar los que están funcionalmente implementados.
  // Los stubs NO se registran. Si se intenta usar uno, getAdapter() devuelve null.
  registry.set("hotelbeds", new HotelbedsAdapter("hotelbeds"));
  registry.set("hotelbeds-activities", new HotelbedsAdapter("hotelbeds-activities"));
  registry.set("hotelbeds-transfers", new HotelbedsAdapter("hotelbeds-transfers"));
  registry.set("duffel", new DuffelAdapter());

  // Cuando se implemente RateHawk de verdad, descomentar:
  // registry.set("ratehawk", new RatehawkAdapter());

  // Idem para los demás.
}

bootstrapAdapters();

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────

export function getAdapter(providerId: string): ProviderAdapter | null {
  return registry.get(providerId) ?? null;
}

export function listImplementedProviders(): string[] {
  return Array.from(registry.keys());
}

export function isProviderImplemented(providerId: string): boolean {
  return registry.has(providerId);
}

// ─────────────────────────────────────────────────────────────
// Re-export de tipos para conveniencia
// ─────────────────────────────────────────────────────────────

export type {
  ProviderAdapter,
  ProviderCategory,
  Credentials,
  TestConnectionResult,
  HotelSearchParams,
  NormalizedHotel,
  NormalizedRoom,
  FlightSearchParams,
  NormalizedFlight,
  ActivitySearchParams,
  NormalizedActivity,
  SearchResult,
  AdapterCallOptions,
  ConnectionStatus,
  AuthType,
  BoardType,
} from "./types";
