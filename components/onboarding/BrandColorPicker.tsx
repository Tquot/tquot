"use client";

import { cn } from "@/lib/utils";
import { BRAND_COLOR_PRESETS } from "@/lib/onboarding/constants";

interface Props {
  primary: string;
  onChange: (primary: string, accent: string) => void;
}

export function BrandColorPicker({ primary, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BRAND_COLOR_PRESETS.map((preset) => {
        const selected =
          preset.primary.toLowerCase() === primary.toLowerCase();
        return (
          <button
            key={preset.name}
            type="button"
            onClick={() => onChange(preset.primary, preset.accent)}
            className={cn(
              "rounded-lg border border-border-1 bg-paper p-3 text-left transition-colors hover:border-border-3",
              selected && "ring-2 ring-accent ring-offset-2 ring-offset-paper",
            )}
          >
            <span className="mb-2 flex gap-1.5">
              <span
                className="h-5 w-5 rounded-full"
                style={{ backgroundColor: preset.primary }}
              />
              <span
                className="h-5 w-5 rounded-full"
                style={{ backgroundColor: preset.accent }}
              />
            </span>
            <span className="block text-body-sm text-ink">{preset.name}</span>
          </button>
        );
      })}
    </div>
  );
}
