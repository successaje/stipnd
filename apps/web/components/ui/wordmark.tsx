import { cn } from "@/lib/cn";

/** The mark is a ledger line with a stop: budget, then a hard limit. */
export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden className="shrink-0">
        <rect x="1" y="1" width="20" height="20" rx="5" fill="currentColor" />
        <path d="M5 11h8" stroke="var(--color-paper)" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 7v8" stroke="var(--color-money-soft)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!compact && <span className="text-[17px] font-semibold tracking-tight">Stipnd</span>}
    </span>
  );
}
