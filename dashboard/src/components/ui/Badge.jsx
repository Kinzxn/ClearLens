import React from "react";
import { cn } from "../../lib/utils";

const variants = {
  default: "bg-foundation text-charcoal border border-border",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  critical: "bg-red-900 text-red-100 border border-red-800",
  accent: "bg-accent-light text-accent border border-indigo-200",
  mono: "bg-slate-100 text-slate-700 border border-border font-mono",
};

export const Badge = ({ className, variant = "default", children, ...props }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      variants[variant],
      className
    )}
    {...props}
  >
    {children}
  </span>
);
Badge.displayName = "Badge";
