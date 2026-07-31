"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function DemoModeCard() {
  return (
    <div className="rounded-lg border border-border-1 bg-paper p-5">
      <Eyebrow className="mb-2 block" tone="accent">
        Modo demo
      </Eyebrow>
      <p className="text-body-sm text-text-2">
        Prueba el canvas sin gastar tokens ni credenciales.
      </p>
      <Link
        href="/dashboard/new-quote?demo=1"
        className="mt-3 inline-flex text-body-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        Abrir cotización demo
      </Link>
    </div>
  );
}
