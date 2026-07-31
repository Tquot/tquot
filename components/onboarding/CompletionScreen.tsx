"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface Props {
  agencyName: string;
}

export function CompletionScreen({ agencyName }: Props) {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Eyebrow className="mb-4 block" tone="accent">
          Listo
        </Eyebrow>
        <h1
          className="font-serif text-display-2 text-ink"
          style={{ fontWeight: 500 }}
        >
          {agencyName || "Tu agencia"} ya puede cotizar.
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-text-2">
          Has completado la configuración. El siguiente paso natural es una
          cotización real desde el dashboard.
        </p>
      </div>

      <div className="h-0.5 w-16 bg-accent" />

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/new-quote"
          className="inline-flex h-12 items-center rounded-md bg-ink px-6 text-body font-medium text-paper hover:bg-ink-2"
        >
          Nueva cotización
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center rounded-md border border-border-1 px-6 text-body text-ink"
        >
          Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
