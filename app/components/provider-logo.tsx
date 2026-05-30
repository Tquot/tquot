"use client";

import { useState } from "react";
import { getProviderClearbitLogoUrl } from "@/lib/connectors/provider-logo";

type ProviderLogoProps = {
  providerId: string;
  name: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

export function ProviderLogo({
  providerId,
  name,
  imageClassName = "h-10 w-10 shrink-0 rounded object-contain",
  fallbackClassName = "flex h-10 w-10 shrink-0 items-center justify-center rounded bg-tquot-bg font-mono text-xs font-semibold text-tquot-muted",
}: ProviderLogoProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const clearbitUrl = getProviderClearbitLogoUrl(providerId);

  if (!clearbitUrl || logoFailed) {
    return (
      <div className={fallbackClassName}>{name.slice(0, 2).toUpperCase()}</div>
    );
  }

  return (
    <img
      src={clearbitUrl}
      alt={name}
      className={imageClassName}
      onError={() => setLogoFailed(true)}
    />
  );
}
