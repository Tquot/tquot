"use client";

interface SparklinePoint {
  date: string;
  value: number;
}

interface SparklineProps {
  data: SparklinePoint[];
  label?: string;
  height?: number;
}

export function Sparkline({
  data,
  label,
  height = 48,
}: SparklineProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((entry) => entry.value), 1);
  const min = Math.min(...data.map((entry) => entry.value), 0);
  const range = max - min || 1;
  const width = 600;
  const pointSpacing = width / (data.length - 1 || 1);

  const points = data.map((entry, index) => {
    const x = index * pointSpacing;
    const y = height - ((entry.value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const last = data[data.length - 1];
  const peak = data.reduce(
    (currentMax, entry) =>
      entry.value > currentMax.value ? entry : currentMax,
    data[0],
  );

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-eyebrow uppercase text-text-3">
            {label}
          </span>
          <span className="font-mono text-mono-sm text-text-2 tabular-nums">
            pico {peak.value} · hoy {last.value}
          </span>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${width} ${height + 4}`}
        preserveAspectRatio="none"
        className="h-12 w-full"
        aria-hidden
      >
        <path d={areaD} fill="rgba(184, 92, 56, 0.08)" />
        <path
          d={pathD}
          stroke="#B85C38"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={(data.length - 1) * pointSpacing}
          cy={height - ((last.value - min) / range) * height}
          r="3"
          fill="#B85C38"
        />
      </svg>
    </div>
  );
}
