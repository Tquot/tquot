import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "umber" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2 active:bg-ink",
  secondary:
    "bg-paper text-ink border border-border-2 hover:border-border-3 hover:bg-paper-2",
  ghost: "bg-transparent text-ink hover:bg-paper-2",
  umber: "bg-umber text-paper hover:bg-umber-2",
  danger: "bg-paper text-danger border border-danger/30 hover:bg-danger/5",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-body-sm rounded-md",
  md: "h-9 px-4 text-body rounded-md",
  lg: "h-11 px-5 text-body rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild,
      loading,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium",
          "transition-colors duration-140 ease-in-out",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? <Spinner size={size === "sm" ? 12 : 14} /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

function Spinner({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-[spinner-arc_700ms_linear_infinite]"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
