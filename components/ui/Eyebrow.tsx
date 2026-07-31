import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  tone?: "default" | "umber" | "accent" | "ink";
  className?: string;
}

export function Eyebrow({ children, tone = "default", className }: Props) {
  const toneStyles = {
    default: "text-text-2",
    umber: "text-umber",
    accent: "text-accent",
    ink: "text-ink",
  };
  return (
    <span className={cn("eyebrow", toneStyles[tone], className)}>
      {children}
    </span>
  );
}
