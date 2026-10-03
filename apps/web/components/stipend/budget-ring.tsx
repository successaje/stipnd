import type { Tone } from "@/components/ui/status";

const COLORS: Record<Tone, string> = {
  money: "var(--color-money)",
  refuse: "var(--color-refuse)",
  warn: "var(--color-warn)",
  neutral: "var(--color-ink-4)",
  info: "var(--color-ink-3)",
};

/** Remaining budget as a ring. `fraction` is 0..1 of the period budget still available. */
export function BudgetRing({
  fraction,
  tone = "money",
  size = 40,
  stroke = 4,
  children,
}: {
  fraction: number;
  tone?: Tone;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-paper-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={COLORS[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.25,1,0.5,1)" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
