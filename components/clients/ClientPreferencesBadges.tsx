import type { InferredPreferences } from "@/lib/clients/types";

interface Props {
  preferences: InferredPreferences;
}

export function ClientPreferencesBadges({ preferences }: Props) {
  const badges: string[] = [];
  if (preferences.preferredHotelTier) badges.push(preferences.preferredHotelTier);
  if (preferences.typicalAudience) badges.push(preferences.typicalAudience);
  if (preferences.frequentDestinations[0]) {
    badges.push(preferences.frequentDestinations[0].destination);
  }
  if (preferences.typicalGroupSize && preferences.typicalGroupSize > 2) {
    badges.push(`${preferences.typicalGroupSize} pax típico`);
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b, idx) => (
        <span
          key={`${b}-${idx}`}
          className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700"
        >
          {b}
        </span>
      ))}
    </div>
  );
}
