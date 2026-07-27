"use client";

import { useState } from "react";
import {
  EXPERIENCE_FEATURE_LABELS,
  HOTEL_FEATURE_LABELS,
  TRANSFER_FEATURE_LABELS,
} from "@/lib/accessibility/catalog";
import {
  EMPTY_ACCESSIBILITY_PROFILE,
  type AccessibilityProfile,
} from "@/lib/accessibility/types";

interface Props {
  profile?: AccessibilityProfile;
  onChange: (p: AccessibilityProfile) => void;
}

export function AccessibilityProfileEditor({ profile, onChange }: Props) {
  const [local, setLocal] = useState(profile ?? EMPTY_ACCESSIBILITY_PROFILE);
  const [open, setOpen] = useState(
    Boolean(
      profile &&
        (profile.required.hotel.length > 0 ||
          profile.required.experience.length > 0 ||
          profile.required.transfer.length > 0),
    ),
  );

  const toggle = (
    section: "required" | "preferred",
    itemType: "hotel" | "experience" | "transfer",
    feature: string,
  ) => {
    const current = local[section][itemType];
    const has = current.includes(feature);
    const next: AccessibilityProfile = {
      ...local,
      [section]: {
        ...local[section],
        [itemType]: has
          ? current.filter((f) => f !== feature)
          : [...current, feature],
      },
    };
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="mx-4 my-3 rounded-lg border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            Perfil de accesibilidad
          </h3>
          <p className="mt-0.5 text-xs text-neutral-600">
            Necesidades específicas de la persona que viaja. Igualdad de
            oportunidades en hoteles, experiencias y traslados.
          </p>
        </div>
        <span className="text-xs text-neutral-500">{open ? "Ocultar" : "Editar"}</span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-neutral-100 px-4 py-3">
          <CategorySection
            title="Hotel"
            labels={HOTEL_FEATURE_LABELS}
            required={local.required.hotel}
            preferred={local.preferred.hotel}
            onToggle={(section, feature) => toggle(section, "hotel", feature)}
          />
          <CategorySection
            title="Experiencias"
            labels={EXPERIENCE_FEATURE_LABELS}
            required={local.required.experience}
            preferred={local.preferred.experience}
            onToggle={(section, feature) =>
              toggle(section, "experience", feature)
            }
          />
          <CategorySection
            title="Traslados"
            labels={TRANSFER_FEATURE_LABELS}
            required={local.required.transfer}
            preferred={local.preferred.transfer}
            onToggle={(section, feature) => toggle(section, "transfer", feature)}
          />
        </div>
      ) : null}
    </div>
  );
}

interface CategoryProps {
  title: string;
  labels: Record<string, string>;
  required: string[];
  preferred: string[];
  onToggle: (section: "required" | "preferred", feature: string) => void;
}

function CategorySection({
  title,
  labels,
  required,
  preferred,
  onToggle,
}: CategoryProps) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold">{title}</h4>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {Object.entries(labels).map(([key, label]) => {
          const isRequired = required.includes(key);
          const isPreferred = preferred.includes(key);
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="flex-1">{label}</span>
              <button
                type="button"
                onClick={() => onToggle("preferred", key)}
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  isPreferred
                    ? "bg-blue-100 text-blue-700"
                    : "bg-neutral-100 text-neutral-500"
                }`}
                title="Preferido"
              >
                Pref
              </button>
              <button
                type="button"
                onClick={() => onToggle("required", key)}
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  isRequired
                    ? "bg-red-100 text-red-700"
                    : "bg-neutral-100 text-neutral-500"
                }`}
                title="Obligatorio"
              >
                Req
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
