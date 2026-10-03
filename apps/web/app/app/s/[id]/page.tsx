"use client";

import { use } from "react";
import Link from "next/link";
import { formatAmount } from "@stipnd/protocol";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/ui/status";
import { PageHeader } from "@/components/shell/app-shell";
import { stipendState } from "@/components/stipend/stipend-row";
import { appConfig } from "@/lib/config";
import { useStipend } from "@/lib/hub/hooks";
import { policySentences } from "@/lib/policy-text";

/**
 * Stipend detail. This first version shows the stipend and its policy; receipts, connect
 * and controls land in the next increment.
 */
export default function StipendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useStipend(id);

  if (q.isPending) {
    return (
      <>
        <Skeleton className="mb-2 h-4 w-20" />
        <Skeleton className="mb-8 h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </>
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
            {s.name}
            <Pill tone={state.tone} dot>
              {state.label}
            </Pill>
          </span>
        }
        description={s.purpose || "No purpose stated"}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Balance" />
          <CardBody className="pt-3">
            <p className="font-mono text-3xl tabular">
              {formatAmount(s.balance, appConfig.token.decimals)}{" "}
              <span className="text-base text-ink-3">{appConfig.token.symbol}</span>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Policy" />
          <CardBody className="pt-3">
            <ul className="space-y-1.5 text-sm text-ink-2">
              {policySentences(s.policy).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
