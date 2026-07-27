import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  /** Sin padding interno */
  flush?: boolean;
}

export const Card = forwardRef<HTMLDivElement, Props>(
  ({ className, interactive, flush, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden rounded-lg border border-border-1 bg-paper shadow-card",
          interactive &&
            "cursor-pointer transition-shadow duration-180 hover:shadow-card-hover",
          !flush && "p-5",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";
