"use client";

import { useEffect, useState } from "react";
import type { Hotel } from "@/lib/quote-engine/types";
import type { HotelContent } from "@/lib/providers/hotelbeds/content-types";
import { groupFacilities } from "@/lib/providers/hotelbeds/content-mapper";

interface Props {
  hotel: Hotel;
}

export function HotelDetailExpanded({ hotel }: Props) {
  const [content, setContent] = useState<HotelContent | null>(
    hotel.content ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hotel.content) {
      setContent(hotel.content);
      return;
    }
    if (hotel.provider !== "hotelbeds" || !hotel.hotelCode) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch(
      `/api/hotels/hotelbeds-content?hotelCode=${encodeURIComponent(hotel.hotelCode)}`,
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("content_unavailable");
        }
        const data = (await response.json()) as { content?: HotelContent | null };
        if (!cancelled) {
          setContent(data.content ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Detalles ampliados no disponibles para este hotel.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hotel.content, hotel.hotelCode, hotel.provider]);

  if (loading) {
    return (
      <div className="mt-3 rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
        Cargando detalles del hotel…
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="mt-3 rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
        {error ?? "Detalles ampliados no disponibles para este hotel."}
      </div>
    );
  }

  const grouped = groupFacilities(content.facilities);

  return (
    <div className="mt-3 space-y-4 rounded-md bg-neutral-50 p-4">
      {content.descriptionLong ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold">Sobre el hotel</h4>
          <p className="text-xs leading-relaxed text-neutral-700 whitespace-pre-line">
            {content.descriptionLong}
          </p>
        </section>
      ) : null}

      {content.address ? (
        <section>
          <h4 className="mb-1 text-xs font-semibold">Ubicación</h4>
          <p className="text-xs text-neutral-700">{content.address}</p>
          {content.zoneName ? (
            <p className="text-xs text-neutral-500">{content.zoneName}</p>
          ) : null}
        </section>
      ) : null}

      <FacilitiesGrid grouped={grouped} />

      {content.cancellationPolicies.length > 0 ? (
        <section className="rounded bg-amber-50 p-3">
          <h4 className="mb-1 text-xs font-semibold text-amber-900">
            Política de cancelación
          </h4>
          <ul className="space-y-0.5">
            {content.cancellationPolicies.map((policy, idx) => (
              <li key={idx} className="text-xs text-amber-900">
                · {policy.amount} {policy.currency} desde{" "}
                {new Date(policy.from).toLocaleDateString("es-ES")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.images.length > 1 ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold">Galería</h4>
          <div className="grid grid-cols-4 gap-1">
            {content.images.slice(0, 8).map((img, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${img.url}-${idx}`}
                src={img.url}
                alt={img.type}
                className="aspect-square w-full rounded object-cover"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FacilitiesGrid({
  grouped,
}: {
  grouped: ReturnType<typeof groupFacilities>;
}) {
  const sections: Array<{ label: string; items: string[] }> = [
    { label: "Habitación", items: grouped.rooms },
    { label: "Bienestar", items: grouped.wellness },
    { label: "Servicios", items: grouped.building },
    { label: "Gastronomía", items: grouped.food },
    { label: "Negocios", items: grouped.business },
    { label: "Familia", items: grouped.family },
    { label: "Playa", items: grouped.beach },
    { label: "Exterior", items: grouped.outdoor },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold">Instalaciones</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="mb-1 text-[11px] font-medium text-neutral-700">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item, idx) => (
                <li key={`${item}-${idx}`} className="text-xs text-neutral-600">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
