"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteLanguage } from "@/app/language-provider";
import { Eyebrow } from "@/components/ui/Eyebrow";

type ProgressStatus = "searching" | "pending" | "done";

interface ProgressItem {
  key: string;
  label: string;
  status: ProgressStatus;
  count?: number;
}

interface FlightData {
  carrier: string;
  depTime: string;
  arrTime: string;
  price: number;
}

interface HotelData {
  name: string;
  stars: number;
  price: number;
  source: string;
  image: string;
}

type DemoStep =
  | { kind: "user"; content: string; delay: number }
  | { kind: "agent"; content: string; delay: number }
  | { kind: "progress"; data: ProgressItem[]; delay: number }
  | { kind: "flight"; data: FlightData; delay: number }
  | { kind: "hotel"; data: HotelData; delay: number };

const LOOP_DELAY = 5000;

export function LiveDemo() {
  const { t } = useSiteLanguage();
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const DEMO_SCRIPT: DemoStep[] = useMemo(
    () => [
      {
        kind: "user",
        content: t.landingFlowMsgUserDemo,
        delay: 400,
      },
      {
        kind: "agent",
        content: t.landingFlowMsgAnalyzeDemo,
        delay: 1400,
      },
      {
        kind: "progress",
        data: [
          { key: "flights", label: t.landingFlowProgressFlights, status: "searching" },
          {
            key: "hotels",
            label: t.landingFlowProgressHotels,
            status: "pending",
          },
          { key: "activities", label: t.landingFlowProgressActivities, status: "pending" },
        ],
        delay: 900,
      },
      {
        kind: "progress",
        data: [
          { key: "flights", label: t.landingFlowProgressFlights, status: "done", count: 10 },
          {
            key: "hotels",
            label: t.landingFlowProgressHotels,
            status: "searching",
          },
          { key: "activities", label: t.landingFlowProgressActivities, status: "pending" },
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
          { key: "flights", label: t.landingFlowProgressFlights, status: "done", count: 10 },
          {
            key: "hotels",
            label: t.landingFlowProgressHotels,
            status: "done",
            count: 8,
          },
          {
            key: "activities",
            label: t.landingFlowProgressActivities,
            status: "searching",
          },
        ],
        delay: 900,
      },
      {
        kind: "hotel",
        data: {
          name: t.landingHotel1Name,
          stars: 4,
          price: 120,
          source: t.landingHotelSourceOwnShort,
          image:
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=800&fit=crop",
        },
        delay: 700,
      },
      {
        kind: "progress",
        data: [
          { key: "flights", label: t.landingFlowProgressFlights, status: "done", count: 10 },
          {
            key: "hotels",
            label: t.landingFlowProgressHotels,
            status: "done",
            count: 8,
          },
          {
            key: "activities",
            label: t.landingFlowProgressActivities,
            status: "done",
            count: 3,
          },
        ],
        delay: 800,
      },
      {
        kind: "agent",
        content: t.landingFlowMsgReadyChat,
        delay: 1400,
      },
    ],
    [t],
  );

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
  }, [DEMO_SCRIPT.length]);

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
  }, [running, step, DEMO_SCRIPT]);

  const visible = DEMO_SCRIPT.slice(0, step);
  const lastProgress = [...visible].reverse().find((item) => item.kind === "progress");

  return (
    <section
      id="demo"
      ref={ref}
      className="border-y border-border-1 bg-paper-2 py-14 sm:py-20"
    >
      <div className="mx-auto max-w-[1200px] px-5">
        <Eyebrow className="mb-3 block">{t.landingFlowEyebrow}</Eyebrow>
        <h2
          className="mb-8 max-w-[640px] font-serif text-h1 text-ink sm:mb-12"
          style={{ fontWeight: 500 }}
        >
          {t.landingFlowTitle}
        </h2>
        <div className="grid max-w-[920px] grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
          <div className="min-h-[460px] space-y-3 rounded-lg border border-border-1 bg-paper p-4 shadow-soft">
            {visible
              .filter(
                (item): item is Extract<DemoStep, { kind: "user" | "agent" }> =>
                  item.kind === "user" || item.kind === "agent",
              )
              .map((item, index) => (
                <DemoMsg key={index} step={item} />
              ))}
          </div>
          <div className="min-h-[460px] space-y-3 rounded-lg border border-border-1 bg-paper p-4 shadow-soft">
            {lastProgress?.kind === "progress" ? (
              <DemoProgress
                data={lastProgress.data}
                optsAbbrev={t.landingFlowOptsAbbrev}
                searchingLabel={t.landingFlowSearching}
              />
            ) : null}
            {visible
              .filter(
                (item): item is Extract<DemoStep, { kind: "flight" }> =>
                  item.kind === "flight",
              )
              .map((item, index) => (
                <DemoFlight key={index} data={item.data} />
              ))}
            {visible
              .filter(
                (item): item is Extract<DemoStep, { kind: "hotel" }> =>
                  item.kind === "hotel",
              )
              .map((item, index) => (
                <DemoHotel
                  key={index}
                  data={item.data}
                  perNight={t.landingCompPerNight}
                />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoMsg({
  step,
}: {
  step: Extract<DemoStep, { kind: "user" | "agent" }>;
}) {
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

function DemoProgress({
  data,
  optsAbbrev,
  searchingLabel,
}: {
  data: ProgressItem[];
  optsAbbrev: string;
  searchingLabel: string;
}) {
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
              {item.count} {optsAbbrev}
            </span>
          ) : item.status === "searching" ? (
            <span className="animate-pulse-soft font-mono text-mono-sm text-text-3">
              {searchingLabel}
            </span>
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}

function DemoFlight({ data }: { data: FlightData }) {
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

function DemoHotel({
  data,
  perNight,
}: {
  data: HotelData;
  perNight: string;
}) {
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
            {perNight}
          </div>
        </div>
      </div>
    </div>
  );
}
