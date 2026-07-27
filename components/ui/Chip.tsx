import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  loading?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, Props>(
  (
    { className, selected, loading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        aria-pressed={selected}
        className={cn(
          "relative inline-flex h-7 items-center justify-center px-3",
          "rounded-full text-body-sm font-medium",
          "transition-all duration-140 ease-in-out",
          "disabled:cursor-not-allowed disabled:opacity-50",
          selected
            ? "bg-ink text-paper"
            : "bg-paper-2 text-text-2 hover:bg-paper-3 hover:text-text",
          loading && "pointer-events-none",
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="animate-pulse-soft">···</span>
        ) : (
          children
        )}
      </button>
    );
  },
);
Chip.displayName = "Chip";
