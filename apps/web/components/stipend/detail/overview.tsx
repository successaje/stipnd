"use client";

import {
  formatAmount,
  formatDuration,
  timeUntil,
  type Receipt,
  type Stipend,
} from "@stipnd/protocol";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/status";
import { appConfig } from "@/lib/config";
import { relativeTime } from "@/lib/time";
import { BudgetRing } from "../budget-ring";
import { spentNow, stipendState } from "../stipend-row";

/** The four numbers an owner glances at: remaining, balance, spent, last activity. */
export function Overview({ s, receipts }: { s: Stipend; receipts?: Receipt[] }) {
  const { decimals, symbol } = appConfig.token;
  const state = stipendState(s);
  const spent = spentNow(s);
  const budget = s.policy.periodBudget;
  const remaining = budget > spent ? budget - spent : 0n;
  const fraction = budget > 0n ? Number((remaining * 1000n) / budget) / 1000 : 0;
  const periodEnd = s.policy.periodLength > 0 ? nextReset(s) : 0;
  const last = receipts?.[0];

  return (
    <Card className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <BudgetRing fraction={fraction} tone={state.tone} size={44} stroke={5} />
        <div className="min-w-0">
          <p className="text-xs text-ink-3">
            Left this {s.policy.periodLength > 0 ? "period" : "stipend"}
          </p>
          <p className="truncate font-mono text-lg tabular">{formatAmount(remaining, decimals)}</p>
          <p className="text-xs text-ink-3">
            {periodEnd ? `resets in ${timeUntil(periodEnd)}` : "no refill"}
          </p>
        </div>
      </div>
      <Stat label="Balance" value={formatAmount(s.balance, decimals)} sub={symbol} />
      <Stat
        label={
          s.policy.periodLength > 0 ? `Spent / ${formatDuration(s.policy.periodLength)}` : "Spent"
        }
        value={formatAmount(spent, decimals)}
        sub={`of ${formatAmount(budget, decimals)}`}
      />
      <div className="px-4 py-4 sm:px-5">
        <p className="text-xs text-ink-3">Last activity</p>
        {last ? (
          <>
            <p className="truncate text-lg">
              <Money tone={last.status === "paid" ? "money" : "refuse"}>
                {formatAmount(last.amount, decimals)}
              </Money>
            </p>
            <p className="truncate text-xs text-ink-3">
              {last.status === "paid" ? "paid" : "refused"} {relativeTime(last.timestamp)}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg text-ink-4">—</p>
            <p className="text-xs text-ink-3">nothing yet</p>
          </>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="truncate font-mono text-lg tabular">{value}</p>
      {sub && <p className="truncate text-xs text-ink-3">{sub}</p>}
    </div>
  );
}

function nextReset(s: Stipend, now = Math.floor(Date.now() / 1000)): number {
  const len = s.policy.periodLength;
  if (len === 0) return 0;
  if (now < s.periodStart + len) return s.periodStart + len;
  const elapsed = Math.floor((now - s.periodStart) / len);
  return s.periodStart + (elapsed + 1) * len;
}
