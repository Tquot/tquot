"use client";

import { createContext, useContext } from "react";

const EmailContext = createContext<string>("");

export function DashboardEmailProvider({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <EmailContext.Provider value={email}>{children}</EmailContext.Provider>
  );
}

export function useDashboardEmail() {
  return useContext(EmailContext);
}
