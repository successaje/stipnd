"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Store } from "lucide-react";
import { isAddress, type Address } from "viem";
import { explorerAddressUrl, formatAmount, shortAddress } from "@stipnd/protocol";
import { Card, CardBody, CardHeader, DefinitionList } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { Money, Pill } from "@/components/ui/status";
import { PageHeader } from "@/components/shell/app-shell";
import { appConfig } from "@/lib/config";
import { useMerchant } from "@/lib/hub/hooks";
import { fetchMerchantPayments } from "@/lib/hub/merchant-activity";
import { absoluteTime, relativeTime } from "@/lib/time";

export default function MerchantPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const valid = isAddress(address);
  const merchant = useMerchant(valid ? (address as Address) : undefined);
  const payments = useQuery({
    queryKey: ["merchant-payments", address],
    enabled: valid,
    queryFn: () => fetchMerchantPayments(address as Address),
    refetchInterval: 10_000,
  });
  const { decimals, symbol } = appConfig.token;

  if (!valid) {
    return (
      <Card>
        <EmptyState
          title="Not an address"
          description="The URL does not contain a valid merchant address."
        />
      </Card>
    );
  }
  if (merchant.isPending) {
    return (
      <div aria-busy>
        <Skeleton className="mb-2 h-4 w-20" />
        <Skeleton className="mb-8 h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const m = merchant.data;
  const explorer = explorerAddressUrl(appConfig.chainId, address);
  const verified = !!m; // identity registry is not configured on this deployment

  return (
    <>
      <PageHeader
        back={{ href: "/app/merchants", label: "Merchants" }}
        title={
          <span className="flex items-center gap-3">
            <span className="truncate">{m?.name ?? shortAddress(address, 6)}</span>
            {m ? (
              <Pill tone="money" dot className="shrink-0">
                Verified
              </Pill>
            ) : (
              <Pill tone="neutral" className="shrink-0">
                Unregistered
              </Pill>
            )}
          </span>
        }
        description={
          m?.url ? (
            <a
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-ink hover:underline"
            >
              {m.url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3.5" />
            </a>
          ) : (
            "This address has received stipend payments but has not registered."
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader
            title="Track record"
            description="Maintained by the hub on every settlement."
          />
          <CardBody className="pt-2">
            <DefinitionList
              items={[
                {
                  term: "Settled payments",
                  detail: String(m?.settlements ?? payments.data?.length ?? 0),
                  mono: true,
                },
                {
                  term: "Volume",
                  detail: `${formatAmount(m?.volume ?? 0n, decimals)} ${symbol}`,
                  mono: true,
                },
                { term: "Tags", detail: m?.tags.length ? m.tags.join(", ") : "—" },
                { term: "Registered", detail: m ? absoluteTime(m.registeredAt) : "No" },
                { term: "Verified", detail: verified ? "Yes" : "No" },
                {
                  term: "Address",
                  detail: explorer ? (
                    <a href={explorer} target="_blank" rel="noreferrer" className="hover:underline">
                      {shortAddress(address, 6)}
                    </a>
                  ) : (
                    shortAddress(address, 6)
                  ),
                  mono: true,
                },
              ]}
            />
            {!m && (
              <p className="mt-4 rounded-md border border-line bg-paper-2/60 p-3 text-xs leading-5 text-ink-3">
                Merchants register from their server key:{" "}
                <code className="font-mono text-ink">
                  pnpm --filter @stipnd/merchant register --name … --url … --tags …
                </code>
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent payments" description="Settled through Stipnd, newest first." />
          {payments.isPending ? (
            <SkeletonRows rows={3} />
          ) : payments.isError ? (
            <EmptyState
              title="Couldn't load payments"
              description="The RPC did not answer. Try again in a moment."
            />
          ) : payments.data && payments.data.length > 0 ? (
            <ul className="divide-y divide-line border-t border-line">
              {payments.data.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="size-2 shrink-0 rounded-full bg-money" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.memo || "Payment"}</p>
                    <p className="truncate text-xs text-ink-3">
                      <Link href={`/app/s/${r.stipendId.toString()}`} className="hover:underline">
                        stipend #{r.stipendId.toString()}
                      </Link>{" "}
                      · {relativeTime(r.timestamp)}
                    </p>
                  </div>
                  <Money tone="money" className="text-sm">
                    {formatAmount(r.amount, decimals)}
                  </Money>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Store className="size-4" />}
              title="No payments yet"
              description="Payments show up here as soon as a stipend pays this merchant."
            />
          )}
        </Card>
      </div>
    </>
  );
}
