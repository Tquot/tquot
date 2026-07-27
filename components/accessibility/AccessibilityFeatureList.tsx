import {
  EXPERIENCE_FEATURE_LABELS,
  HOTEL_FEATURE_LABELS,
  TRANSFER_FEATURE_LABELS,
} from "@/lib/accessibility/catalog";

interface Props {
  features: Record<string, boolean | undefined>;
  itemType: "hotel" | "experience" | "transfer";
  compact?: boolean;
}

export function AccessibilityFeatureList({
  features,
  itemType,
  compact,
}: Props) {
  const labels =
    itemType === "hotel"
      ? HOTEL_FEATURE_LABELS
      : itemType === "experience"
        ? EXPERIENCE_FEATURE_LABELS
        : TRANSFER_FEATURE_LABELS;

  const present = Object.entries(features)
    .filter(([, v]) => v)
    .map(([k]) => labels[k as keyof typeof labels])
    .filter(Boolean);

  if (present.length === 0) {
    return (
      <p className="text-xs text-neutral-500">
        Sin información de accesibilidad.
      </p>
    );
  }

  if (compact) {
    return (
      <p className="text-xs text-neutral-700">
        {present.slice(0, 4).join(" · ")}
        {present.length > 4 ? ` y ${present.length - 4} más` : ""}
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-xs text-neutral-700">
      {present.map((label) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {label}
        </li>
      ))}
    </ul>
  );
}
