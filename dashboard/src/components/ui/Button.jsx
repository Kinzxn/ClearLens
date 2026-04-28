import React from "react";
import { cn } from "../../lib/utils";

const variants = {
  primary:
    "bg-accent text-white hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
  secondary:
    "bg-white text-charcoal border border-border hover:bg-foundation focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
  ghost:
    "text-slate-600 hover:bg-foundation hover:text-charcoal",
  danger:
    "bg-white text-red-600 border border-red-200 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
};

const sizes = {
  sm: "h-7 px-3 text-xs rounded-md gap-1.5",
  md: "h-9 px-4 text-sm rounded-lg gap-2",
  lg: "h-11 px-6 text-base rounded-lg gap-2.5",
  icon: "h-8 w-8 rounded-md",
};

/**
 * Button with 120ms ease-out hover, accent-only primary CTA.
 */
export const Button = React.forwardRef(
  (
    {
      className,
      variant = "primary",
      size = "md",
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium select-none",
        "transition-[color,background-color,border-color,opacity] duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        "focus-visible:outline-none",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
