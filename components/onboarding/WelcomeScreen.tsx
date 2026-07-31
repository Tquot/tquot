"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface Props {
  onStartLive: () => void;
  onStartDemo: () => void;
}

export function WelcomeScreen({ onStartLive, onStartDemo }: Props) {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Eyebrow className="mb-4 block">Bienvenida</Eyebrow>
        <h1
          className="font-serif text-display-2 text-ink"
          style={{ fontWeight: 500 }}
        >
          Tu agencia, lista para cotizar en minutos.
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-text-2">
          Vamos a configurar identidad, un proveedor y tu primera cotización.
          Puedes probar primero con datos demo —{" "}
          <span className="text-accent">cero llamadas a proveedores</span>.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onStartLive}
          className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-6 text-body font-medium text-paper transition-colors hover:bg-ink-2"
        >
          Empezar configuración
        </button>
        <button
          type="button"
          onClick={onStartDemo}
          className="inline-flex h-12 items-center justify-center rounded-md border border-border-2 px-6 text-body font-medium text-ink transition-colors hover:border-border-3"
        >
          Probar en modo demo
        </button>
      </div>

      <p className="text-body-sm text-text-3">
        ¿Ya tienes cuenta configurada?{" "}
        <Link href="/dashboard" className="text-accent underline-offset-2 hover:underline">
          Ir al dashboard
        </Link>
      </p>
    </div>
  );
}
