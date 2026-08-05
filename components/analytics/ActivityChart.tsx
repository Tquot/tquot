"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

interface Props {
  daily: Array<{ day: string; quotes: number; volume: number }>;
}

type Mode = "quotes" | "volume";

export function ActivityChart({ daily }: Props) {
  const [mode, setMode] = useState<Mode>("quotes");

  const data = daily.map((d) => ({
    ...d,
    label: new Date(d.day).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    }),
  }));

  const peak = data.reduce((max, d) => (d[mode] > max[mode] ? d : max), data[0]);
  const total = data.reduce((s, d) => s + d[mode], 0);

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <Eyebrow className="block mb-1">Actividad</Eyebrow>
          <p className="font-mono text-mono-sm text-text-2 tabular-nums">
            total{" "}
            {mode === "volume"
              ? `${Math.round(total).toLocaleString("es-ES")} €`
              : total}
            {peak &&
              ` · pico ${
                mode === "volume"
                  ? `${Math.round(peak.volume).toLocaleString("es-ES")} €`
                  : peak.quotes
              } el ${
                peak ? peak.label : ""
              }`}
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["quotes", "volume"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "h-7 px-3 rounded-full text-body-sm font-medium transition-colors duration-140",
                mode === m
                  ? "bg-ink text-paper"
                  : "bg-paper-2 text-text-2 hover:bg-paper-3",
              )}
            >
              {m === "quotes" ? "Cotizaciones" : "Volumen"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[220px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-accent)"
                  stopOpacity={0.16}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-accent)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9A9C9E", fontFamily: "var(--font-geist-mono)" }}
              axisLine={{ stroke: "#EBE8E0" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9A9C9E", fontFamily: "var(--font-geist-mono)" }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v) => (mode === "volume" ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip content={<ChartTooltip mode={mode} />} />
            <Area
              type="monotone"
              dataKey={mode}
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              fill="url(#areaFill)"
              dot={false}
              activeDot={{ r: 3, fill: "var(--color-accent)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  mode: Mode;
};

function ChartTooltip({ active, payload, label, mode }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;

  return (
    <div className="bg-paper border border-border-2 rounded-md shadow-card px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-3">
        {label}
      </p>
      <p className="font-mono text-mono-md text-ink tabular-nums mt-0.5">
        {mode === "volume"
          ? `${Math.round(value).toLocaleString("es-ES")} €`
          : `${value} ${value === 1 ? "cotización" : "cotizaciones"}`}
      </p>
    </div>
  );
}

