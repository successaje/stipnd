"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatAmount, formatDuration, type Stipend } from "@stipnd/protocol";
import { Money, Pill } from "@/components/ui/status";
import { appConfig } from "@/lib/config";
import { BudgetRing } from "./budget-ring";

export function stipendState(s: Stipend, now = Math.floor(Date.now() / 1000)) {
  if (s.frozen) return { label: "Frozen", tone: "refuse" as const };
  if (s.policy.expiresAt > 0 && now >= s.policy.expiresAt)
    return { label: "Expired", tone: "neutral" as const };
  if (s.balance === 0n) return { label: "Empty", tone: "warn" as const };
  return { label: "Active", tone: "money" as const };
}

/** Period-aware spent amount without an extra RPC: mirrors the hub's lazy roll-over. */
export function spentNow(s: Stipend, now = Math.floor(Date.now() / 1000)) {
  const len = s.policy.periodLength;
  if (len > 0 && now >= s.periodStart + len) return 0n;
  return s.spentThisPeriod;
}

export function StipendRow({ s }: { s: Stipend }) {
  const { symbol, decimals } = appConfig.token;
  const state = stipendState(s);
  const spent = spentNow(s);
  const budget = s.policy.periodBudget;
  const remaining = budget > spent ? budget - spent : 0n;
  const fraction = budget > 0n ? Number((remaining * 1000n) / budget) / 1000 : 0;

  return (
    <li>
      <Link
        href={`/app/s/${s.id.toString()}`}
        className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-paper-2/60 sm:px-5"
      >
        <BudgetRing fraction={fraction} tone={state.tone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold">{s.name}</p>
            <Pill tone={state.tone} className="h-5 px-1.5 text-[11px]">
              {state.label}
            </Pill>
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-3">{s.purpose || "No purpose stated"}</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-sm">
            <Money>{formatAmount(remaining, decimals)}</Money>
            <span className="text-ink-3">
              {" "}
              / {formatAmount(budget, decimals)} {symbol}
            </span>
          </p>
          <p className="text-xs text-ink-3">
            {s.policy.periodLength > 0
              ? `per ${formatDuration(s.policy.periodLength)}`
              : "one-time"}{" "}
            · balance {formatAmount(s.balance, decimals)}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}
