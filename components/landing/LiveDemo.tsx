"use client";

import { useEffect, useRef, useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface DemoStep {
  kind: "user" | "agent" | "progress" | "flight" | "hotel";
  content?: string;
  data?: any;
  delay: number;
}

const DEMO_SCRIPT: DemoStep[] = [
  {
    kind: "user",
    content:
      "Vuelo Madrid a Lanzarote del 6 al 18 de agosto, 2 adultos, hotel cerca de Playa Blanca 4 estrellas, alquiler de coche y alguna actividad en la isla.",
    delay: 400,
  },
  {
    kind: "agent",
    content:
      "Analizando petición. Destino ACE, 12 noches, hotel 4★ en Playa Blanca, coche y actividades.",
    delay: 1400,
  },
  {
    kind: "progress",
    data: [
      { key: "flights", label: "Vuelos · MAD → ACE", status: "searching" },
      {
        key: "hotels",
        label: "Hoteles · Playa Blanca · 4★",
        status: "pending",
      },
      { key: "activities", label: "Actividades · Lanzarote", status: "pending" },
    ],
    delay: 900,
  },
  {
    kind: "progress",
    data: [
      { key: "flights", label: "Vuelos · MAD → ACE", status: "done", count: 10 },
      {
        key: "hotels",
        label: "Hoteles · Playa Blanca · 4★",
        status: "searching",
      },
      { key: "activities", label: "Actividades · Lanzarote", status: "pending" },
    ],
    delay: 800,
  },
  {
    kind: "flight",
    data: { carrier: "VY", depTime: "08:15", arrTime: "10:30", price: 187 },
    delay: 600,
  },
  {
    kind: "progress",
    data: [
      { key: "flights", label: "Vuelos · MAD → ACE", status: "done", count: 10 },
      {
        key: "hotels",
        label: "Hoteles · Playa Blanca · 4★",
        status: "done",
        count: 8,
      },
      {
        key: "activities",
        label: "Actividades · Lanzarote",
        status: "searching",
      },
    ],
    delay: 900,
  },
  {
    kind: "hotel",
    data: {
      name: "Barceló Teguise Beach",
      stars: 4,
      price: 120,
      source: "Tu inventario",
      image:
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=800&fit=crop",
    },
    delay: 700,
  },
  {
    kind: "progress",
    data: [
      { key: "flights", label: "Vuelos · MAD → ACE", status: "done", count: 10 },
      {
        key: "hotels",
        label: "Hoteles · Playa Blanca · 4★",
        status: "done",
        count: 8,
      },
      {
        key: "activities",
        label: "Actividades · Lanzarote",
        status: "done",
        count: 3,
      },
    ],
    delay: 800,
  },
  {
    kind: "agent",
    content:
      "Listo. Vuelo VY 187 €, Barceló Teguise Beach 4★ a 120 €/noche desde tu inventario, coche 12 días y 2 actividades. Total: 2 847 €. ¿Añado seguro?",
    delay: 1400,
  },
];

const LOOP_DELAY = 5000;

export function LiveDemo() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRunning(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(DEMO_SCRIPT.length);
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    if (step >= DEMO_SCRIPT.length) {
      const timeout = setTimeout(() => setStep(0), LOOP_DELAY);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(
      () => setStep((current) => current + 1),
      DEMO_SCRIPT[step]?.delay ?? 600,
    );
    return () => clearTimeout(timeout);
  }, [running, step]);

  const visible = DEMO_SCRIPT.slice(0, step);
  const lastProgress = [...visible].reverse().find((item) => item.kind === "progress");

  return (
    <section
      id="demo"
      ref={ref}
      className="border-y border-border-1 bg-paper-2 py-14 sm:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">TQuot Agent</Eyebrow>
        <h2
          className="mb-8 max-w-[640px] font-serif text-h1 text-ink sm:mb-12"
          style={{ fontWeight: 500 }}
        >
          El agente habla. TQuot trabaja.
        </h2>
        <div className="grid max-w-[920px] grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
          <div className="min-h-[460px] space-y-3 rounded-lg border border-border-1 bg-paper p-4 shadow-soft">
            {visible
              .filter((item) => item.kind === "user" || item.kind === "agent")
              .map((item, index) => (
                <DemoMsg key={index} step={item} />
              ))}
          </div>
          <div className="min-h-[460px] space-y-3 rounded-lg border border-border-1 bg-paper p-4 shadow-soft">
            {lastProgress ? <DemoProgress data={lastProgress.data} /> : null}
            {visible
              .filter((item) => item.kind === "flight")
              .map((item, index) => (
                <DemoFlight key={index} data={item.data} />
              ))}
            {visible
              .filter((item) => item.kind === "hotel")
              .map((item, index) => (
                <DemoHotel key={index} data={item.data} />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoMsg({ step }: { step: DemoStep }) {
  if (step.kind === "user") {
    return (
      <div className="flex justify-end animate-slide-up-fade">
        <div className="max-w-[88%] rounded-lg rounded-tr-sm border border-border-1 bg-paper-2 px-3 py-2 text-body-sm leading-relaxed">
          {step.content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 animate-slide-up-fade">
      <span className="font-mono text-eyebrow text-umber">TQUOT</span>
      <div className="text-body-sm leading-relaxed text-text">{step.content}</div>
    </div>
  );
}

function DemoProgress({ data }: { data: any[] }) {
  return (
    <div className="mb-2 space-y-1.5 animate-slide-up-fade">
      {data.map((item) => (
        <div
          key={item.key}
          className="grid grid-cols-[14px_1fr_auto] items-center gap-2 text-body-sm"
        >
          <span>
            {item.status === "searching" ? (
              <span className="inline-block animate-pulse-soft text-umber">⟳</span>
            ) : null}
            {item.status === "done" ? (
              <span className="text-success">✓</span>
            ) : null}
            {item.status === "pending" ? <span className="text-text-3">·</span> : null}
          </span>
          <span className={item.status === "done" ? "text-ink" : "text-text-2"}>
            {item.label}
          </span>
          {item.count != null ? (
            <span className="font-mono text-mono-sm text-text-2 tabular-nums">
              {item.count} opc.
            </span>
          ) : item.status === "searching" ? (
            <span className="animate-pulse-soft font-mono text-mono-sm text-text-3">
              buscando
            </span>
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}

function DemoFlight({ data }: { data: any }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border-1 p-3 animate-slide-up-fade">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ink font-mono text-mono-sm font-semibold text-paper">
        {data.carrier}
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
        <div>
          <div className="font-mono text-mono-md text-ink tabular-nums">{data.depTime}</div>
          <div className="text-[10px] uppercase tracking-wider text-text-3">MAD</div>
        </div>
        <div>
          <div className="font-mono text-mono-md text-ink tabular-nums">{data.arrTime}</div>
          <div className="text-[10px] uppercase tracking-wider text-text-3">ACE</div>
        </div>
      </div>
      <div className="shrink-0 font-mono text-[15px] text-ink">{data.price} €</div>
    </div>
  );
}

function DemoHotel({ data }: { data: any }) {
  return (
    <div className="overflow-hidden rounded-md border border-border-1 animate-slide-up-fade">
      <div className="relative aspect-[16/8] overflow-hidden bg-paper-3">
        <img
          src={data.image}
          alt=""
          className="absolute inset-0 h-full w-full animate-photo-reveal object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink/60 to-transparent" />
        <span className="absolute top-2 left-2 rounded-full bg-umber/95 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-paper">
          {data.source}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3 p-3">
        <div className="min-w-0">
          <h3
            className="truncate font-serif text-[17px] leading-tight text-ink"
            style={{ fontWeight: 500 }}
          >
            {data.name}
          </h3>
          <span className="text-[11px] tracking-wider text-umber">
            {"★".repeat(data.stars)}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-mono-md text-ink tabular-nums">
            {data.price} €
          </div>
          <div className="text-[10px] uppercase tracking-wider text-text-3">
            /noche
          </div>
        </div>
      </div>
    </div>
  );
}
