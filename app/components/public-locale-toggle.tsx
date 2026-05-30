"use client";

import { LocaleToggleButtons } from "@/app/dashboard/locale-toggle-buttons";

type PublicLocaleToggleProps = {
  className?: string;
  variant?: "light" | "dark";
};

export function PublicLocaleToggle({
  className = "",
  variant = "light",
}: PublicLocaleToggleProps) {
  return (
    <LocaleToggleButtons className={className} variant={variant} />
  );
}
