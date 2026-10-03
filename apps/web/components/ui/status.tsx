import * as React from "react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "money" | "refuse" | "warn" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-2 text-ink-2 border-line",
  money: "bg-money-soft text-money-ink border-money/20",
  refuse: "bg-refuse-soft text-refuse-ink border-refuse/20",
  warn: "bg-warn-soft text-warn border-warn/25",
  info: "bg-info-soft text-ink-2 border-line",
};

export function Pill({
  tone = "neutral",
  className,
  dot,
  children,
}: {
  tone?: Tone;
  className?: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full bg-current")} aria-hidden />}
      {children}
    </span>
  );
}

/** Monospaced money. Pass the already formatted string. */
export function Money({
  children,
  className,
  tone,
  sign,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: Tone;
  sign?: "+" | "-";
}) {
  return (
    <span
      className={cn(
        "font-mono tabular",
        tone === "money" && "text-money-ink",
        tone === "refuse" && "text-refuse-ink line-through decoration-refuse/40",
        className,
      )}
    >
      {sign}
      {children}
    </span>
  );
}
