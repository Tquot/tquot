import type { BookingHandoffStrategy, BookingHandoff, HandoffContext } from "./types";
import { hotelbedsStrategy } from "./hotelbeds";
import { duffelStrategy } from "./duffel";
import { bookingComStrategy } from "./booking-com";

const REGISTRY = new Map<string, BookingHandoffStrategy<unknown>>();

REGISTRY.set("hotelbeds", hotelbedsStrategy);
REGISTRY.set("duffel", duffelStrategy);
REGISTRY.set("booking", bookingComStrategy);

/**
 * Devuelve el handoff para un item, o null si el proveedor no está registrado.
 */
export function getHandoff(
  provider: string,
  item: unknown,
  context: HandoffContext,
): BookingHandoff | null {
  const strategy = REGISTRY.get(provider);
  if (!strategy) return null;
  return strategy.buildHandoff(item, context);
}

/**
 * Para extender el registry desde código de aplicación (ej. tests o features).
 */
export function registerStrategy(strategy: BookingHandoffStrategy<unknown>) {
  REGISTRY.set(strategy.provider, strategy);
}

export function getRegisteredProviders(): string[] {
  return Array.from(REGISTRY.keys());
}
