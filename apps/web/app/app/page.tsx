"use client";

import Link from "next/link";
import { Plus, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shell/app-shell";
import { StipendRow } from "@/components/stipend/stipend-row";
import { useAccount } from "@/lib/account/provider";
import { useStipends } from "@/lib/hub/hooks";

export default function StipendsPage() {
  const { address } = useAccount();
  const stipends = useStipends(address);

  return (
    <>
      <PageHeader
        title="Stipends"
        description="Each stipend is a budget with rules. Agents spend from it; you read the receipts."
        action={
          <Link href="/app/new">
            <Button leading={<Plus className="size-4" />}>New stipend</Button>
          </Link>
        }
      />

      <Card>
        {stipends.isPending ? (
          <SkeletonRows rows={3} />
        ) : stipends.isError ? (
          <EmptyState
            title="Couldn't load your stipends"
            description="The RPC did not answer. Your stipends are safe onchain; this page just can't read them right now."
            action={
              <Button variant="secondary" onClick={() => stipends.refetch()}>
                Try again
              </Button>
            }
          />
        ) : stipends.data && stipends.data.length > 0 ? (
          <ul className="divide-y divide-line">
            {stipends.data.map((s) => (
              <StipendRow key={s.id.toString()} s={s} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<WalletCards className="size-4" />}
            title="No stipends yet"
            description="That's expected on a new account. Create one, give it a budget and rules, then connect an agent with a single credential."
            action={
              <Link href="/app/new">
                <Button leading={<Plus className="size-4" />}>Create your first stipend</Button>
              </Link>
            }
          />
        )}
      </Card>
    </>
  );
}
