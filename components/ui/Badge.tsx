import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "ink"
  | "umber"
  | "success"
  | "warning"
  | "danger"
  | "info";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-paper-2 text-text border border-border-1",
  ink: "bg-ink text-paper",
  umber: "bg-umber/10 text-umber border border-umber/20",
  success: "bg-success/10 text-success border border-success/20",
  warning: "bg-warning/15 text-[#7B5D1E] border border-warning/30",
  danger: "bg-danger/10 text-danger border border-danger/25",
  info: "bg-info/10 text-info border border-info/20",
};

interface Props {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
