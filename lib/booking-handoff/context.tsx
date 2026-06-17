"use client";

import { createContext, useContext } from "react";
import type { AgencyBookingConfig } from "./types";

const Ctx = createContext<AgencyBookingConfig | null>(null);

export function BookingConfigProvider({
  config,
  children,
}: {
  config: AgencyBookingConfig;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={config}>{children}</Ctx.Provider>;
}

export function useBookingConfig(): AgencyBookingConfig {
  const config = useContext(Ctx);
  if (!config) throw new Error("useBookingConfig outside provider");
  return config;
}
