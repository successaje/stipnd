"use client";

import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";
import { formatAmount, shortAddress } from "@stipnd/protocol";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Pill } from "@/components/ui/status";
import { PageHeader } from "@/components/shell/app-shell";
import { appConfig } from "@/lib/config";
import { useMerchants } from "@/lib/hub/hooks";

export default function MerchantsPage() {
  const merchants = useMerchants();
  return (
    <>
      <PageHeader
        title="Merchants"
        description="Registered sellers that accept stipend payments. Stipends in verified mode only pay merchants listed here."
      />
      <Card>
        {merchants.isPending ? (
          <SkeletonRows rows={3} />
        ) : merchants.isError ? (
          <EmptyState
            title="Couldn't load the directory"
            description="The RPC did not answer. Try again in a moment."
          />
        ) : merchants.data && merchants.data.length > 0 ? (
          <ul className="divide-y divide-line">
            {merchants.data.map((m) => (
              <li key={m.address}>
                <Link
                  href={`/app/merchants/${m.address}`}
                  className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-paper-2/60 sm:px-5"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-paper-2 text-ink-2">
                    <Store className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold">{m.name}</p>
                      {m.tags.map((t) => (
                        <Pill key={t} className="h-5 px-1.5 text-[11px]">
                          {t}
                        </Pill>
                      ))}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-3">
                      {m.url ? m.url.replace(/^https?:\/\//, "") : shortAddress(m.address, 6)}
                    </p>
                  </div>
                  <div className="hidden text-right text-sm sm:block">
                    <p className="font-mono tabular">{m.settlements} settled</p>
                    <p className="text-xs text-ink-3">
                      {formatAmount(m.volume, appConfig.token.decimals)} {appConfig.token.symbol}{" "}
                      volume
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Store className="size-4" />}
            title="No merchants registered yet"
            description="The directory is empty on this deployment. Merchants register from their server key with the register script in apps/merchant. Stipends in 'Any merchant' mode work without it."
          />
        )}
      </Card>
    </>
  );
}
