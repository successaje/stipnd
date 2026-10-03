"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ExternalLink, Receipt as ReceiptIcon } from "lucide-react";
import {
  explorerTxUrl,
  formatAmount,
  REJECT_COPY,
  RejectReason,
  shortAddress,
  type Merchant,
  type Receipt,
} from "@stipnd/protocol";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/field";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Money, Pill } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import { appConfig } from "@/lib/config";
import { absoluteTime, relativeTime } from "@/lib/time";

type Filter = "all" | "paid" | "rejected";

export function ReceiptList({
  receipts,
  merchants,
  loading,
  error,
  onRetry,
  onConnect,
}: {
  receipts: Receipt[] | undefined;
  merchants: Map<string, Merchant>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onConnect: () => void;
}) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [open, setOpen] = React.useState<string | null>(null);

  if (loading) return <SkeletonRows rows={4} />;
  if (error) {
    return (
      <EmptyState
        title="Couldn't load receipts"
        description="The RPC did not return the hub's events. Nothing is lost; try again."
        action={
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!receipts || receipts.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptIcon className="size-4" />}
        title="No payments yet"
        description="Receipts appear here the moment an agent pays, or tries to. Connect an agent with a credential to start."
        action={
          <Button variant="secondary" onClick={onConnect}>
            Connect an agent
          </Button>
        }
      />
    );
  }

  const shown = receipts.filter((r) => filter === "all" || r.status === filter);
  const rejectedLastHour = receipts.filter(
    (r) => r.status === "rejected" && r.timestamp && Date.now() / 1000 - r.timestamp < 3600,
  ).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <Segmented
          ariaLabel="Filter receipts"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${receipts.length}` },
            { value: "paid", label: "Paid" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        {rejectedLastHour > 0 && (
          <Pill tone="refuse" dot>
            {rejectedLastHour} refused in the last hour
          </Pill>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={`No ${filter} receipts`}
          description="Nothing matches this filter yet."
        />
      ) : (
        <ul className="divide-y divide-line">
          <AnimatePresence initial={false}>
            {shown.map((r) => {
              const m = merchants.get(r.merchant.toLowerCase());
              const isOpen = open === r.id;
              const paid = r.status === "paid";
              const reason = r.reason ?? RejectReason.None;
              return (
                <motion.li
                  key={r.id}
                  layout="position"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : r.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-2/60 sm:px-5"
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        paid ? "bg-money" : "bg-refuse",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {r.memo || (paid ? "Payment" : REJECT_COPY[reason].title)}
                        <span className="text-ink-3"> · {m?.name ?? shortAddress(r.merchant)}</span>
                      </p>
                      <p className="truncate text-xs text-ink-3">
                        {paid
                          ? `Paid · ${formatAmount(r.remainingThisPeriod ?? 0n, appConfig.token.decimals)} left this period`
                          : REJECT_COPY[reason].title}
                        {r.timestamp ? ` · ${relativeTime(r.timestamp)}` : ""}
                      </p>
                    </div>
                    <Money tone={paid ? "money" : "refuse"} className="text-sm">
                      {formatAmount(r.amount, appConfig.token.decimals)}
                    </Money>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-ink-4 transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <ReceiptDetails r={r} merchant={m} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function ReceiptDetails({ r, merchant }: { r: Receipt; merchant?: Merchant }) {
  const tx = explorerTxUrl(appConfig.chainId, r.txHash);
  const reason = r.reason ?? RejectReason.None;
  return (
    <dl className="grid gap-x-6 gap-y-2 border-t border-line bg-paper-2/40 px-4 py-3 text-xs sm:grid-cols-2 sm:px-5">
      {r.status === "rejected" && (
        <div className="sm:col-span-2">
          <dt className="text-ink-3">Why</dt>
          <dd className="mt-0.5 text-sm text-ink">{REJECT_COPY[reason].detail}</dd>
        </div>
      )}
      <div>
        <dt className="text-ink-3">Merchant</dt>
        <dd className="mt-0.5 font-mono text-[12px] text-ink">
          <Link href={`/app/merchants/${r.merchant}`} className="hover:underline">
            {merchant ? `${merchant.name} · ` : ""}
            {r.merchant}
          </Link>
        </dd>
      </div>
      <div>
        <dt className="text-ink-3">When</dt>
        <dd className="mt-0.5 text-ink">{absoluteTime(r.timestamp)}</dd>
      </div>
      <div>
        <dt className="text-ink-3">Resource</dt>
        <dd className="mt-0.5 break-all font-mono text-[12px] text-ink">{r.resourceHash}</dd>
      </div>
      <div>
        <dt className="text-ink-3">Transaction</dt>
        <dd className="mt-0.5 font-mono text-[12px] text-ink">
          {tx ? (
            <a
              href={tx}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              {shortAddress(r.txHash, 8)} <ExternalLink className="size-3" />
            </a>
          ) : (
            shortAddress(r.txHash, 8)
          )}
        </dd>
      </div>
      {r.status === "paid" && r.balance !== undefined && (
        <div>
          <dt className="text-ink-3">Stipend balance after</dt>
          <dd className="mt-0.5 font-mono text-[12px] text-ink">
            {formatAmount(r.balance, appConfig.token.decimals)} {appConfig.token.symbol}
          </dd>
        </div>
      )}
    </dl>
  );
}
