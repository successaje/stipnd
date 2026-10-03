"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "money";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Text shown while `loading`. Defaults to children. */
  loadingLabel?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none " +
  "transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-out " +
  "active:translate-y-px disabled:opacity-50 disabled:active:translate-y-0";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2 shadow-[inset_0_-1px_0_rgb(255_255_255/0.08)]",
  secondary: "bg-surface text-ink border border-line hover:border-line-2 hover:bg-paper-2",
  ghost: "bg-transparent text-ink-2 hover:bg-paper-2 hover:text-ink",
  danger: "bg-refuse text-white hover:bg-refuse-ink",
  money: "bg-money text-white hover:bg-money-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading,
    loadingLabel,
    leading,
    trailing,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leading}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
      {!loading && trailing}
    </button>
  );
});
