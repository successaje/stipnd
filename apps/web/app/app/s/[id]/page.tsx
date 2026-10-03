"use client";

import * as React from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Merchant } from "@stipnd/protocol";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/ui/status";
import { PageHeader } from "@/components/shell/app-shell";
import { stipendState } from "@/components/stipend/stipend-row";
import { Overview } from "@/components/stipend/detail/overview";
import { FreezeButton, FundDialog, WithdrawDialog } from "@/components/stipend/detail/controls";
import { ReceiptList } from "@/components/stipend/detail/receipt-list";
import { ConnectTab } from "@/components/stipend/detail/connect-tab";
import { PolicyTab } from "@/components/stipend/detail/policy-tab";
import { cn } from "@/lib/cn";
import { useMerchants, useStipend } from "@/lib/hub/hooks";
import { useReceipts } from "@/lib/hub/use-receipts";

type Tab = "receipts" | "connect" | "policy";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "receipts", label: "Receipts" },
  { id: "connect", label: "Connect" },
  { id: "policy", label: "Rules" },
];

export default function StipendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <React.Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <StipendDetail id={id} />
    </React.Suspense>
  );
}

function StipendDetail({ id }: { id: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const tab = (search.get("tab") as Tab | null) ?? "receipts";
  const setTab = (t: Tab) => router.replace(`/app/s/${id}${t === "receipts" ? "" : `?tab=${t}`}`);

  const q = useStipend(id);
  const receipts = useReceipts(id);
  const merchants = useMerchants();
  const merchantMap = React.useMemo(() => {
    const m = new Map<string, Merchant>();
    for (const x of merchants.data ?? []) m.set(x.address.toLowerCase(), x);
    return m;
  }, [merchants.data]);

  if (q.isPending) {
    return (
      <div aria-busy>
        <Skeleton className="mb-2 h-4 w-20" />
        <Skeleton className="mb-8 h-8 w-64" />
        <Skeleton className="mb-4 h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (q.isError || !q.data || q.data.owner === "0x0000000000000000000000000000000000000000") {
    return (
      <Card>
        <EmptyState
          title="Stipend not found"
          description="There is no stipend with this id on this deployment, or the RPC did not answer."
          action={
            <Link href="/app" className="text-sm font-medium text-ink hover:underline">
              Back to stipends
            </Link>
          }
        />
      </Card>
    );
  }

  const s = q.data;
  const state = stipendState(s);

  return (
    <>
      <PageHeader
        back={{ href: "/app", label: "Stipends" }}
        title={
          <span className="flex items-center gap-3">
            <span className="truncate">{s.name}</span>
            <Pill tone={state.tone} dot className="shrink-0">
              {state.label}
            </Pill>
          </span>
        }
        description={s.purpose || "No purpose stated"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <WithdrawDialog s={s} />
            <FundDialog s={s} />
            <FreezeButton s={s} />
          </div>
        }
      />

      {s.frozen && (
        <div
          className="mb-4 rounded-md border border-refuse/30 bg-refuse-soft px-4 py-3 text-sm text-refuse-ink"
          role="status"
        >
          Frozen. Every payment attempt is refused and recorded until you unfreeze.
        </div>
      )}

      <Overview s={s} receipts={receipts.data} />

      <Card className="mt-4">
        <div
          className="flex items-center gap-1 border-b border-line px-2 sm:px-3"
          role="tablist"
          aria-label="Stipend sections"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative px-3 py-3 text-sm transition-colors",
                  active ? "text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                {t.label}
                {active && (
                  <span
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-ink"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
        <div role="tabpanel">
          {tab === "receipts" && (
            <ReceiptList
              receipts={receipts.data}
              merchants={merchantMap}
              loading={receipts.isPending}
              error={receipts.isError}
              onRetry={() => receipts.refetch()}
              onConnect={() => setTab("connect")}
            />
          )}
          {tab === "connect" && <ConnectTab s={s} />}
          {tab === "policy" && <PolicyTab s={s} />}
        </div>
      </Card>
    </>
  );
}
