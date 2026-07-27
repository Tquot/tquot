import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  tone?: "default" | "umber" | "ink";
  className?: string;
}

export function Eyebrow({ children, tone = "default", className }: Props) {
  const toneStyles = {
    default: "text-text-2",
    umber: "text-umber",
    ink: "text-ink",
  };
  return (
    <span className={cn("eyebrow", toneStyles[tone], className)}>
      {children}
    </span>
  );
}
