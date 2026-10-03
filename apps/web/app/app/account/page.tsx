"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { explorerAddressUrl, formatAmount, shortAddress } from "@stipnd/protocol";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DefinitionList } from "@/components/ui/card";
import { Money, Pill } from "@/components/ui/status";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shell/app-shell";
import { useReadyAccount } from "@/lib/account/provider";
import { appConfig, faucets } from "@/lib/config";
import { useTokenBalance } from "@/lib/hub/hooks";

export default function AccountPage() {
  const { address, kind, label, signOut } = useReadyAccount();
  const balance = useTokenBalance(address);
  const [copied, setCopied] = React.useState(false);
  const explorer = explorerAddressUrl(appConfig.chainId, address);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy. Select the address and copy it manually.");
    }
  }

  return (
    <>
      <PageHeader
        title="Account"
        description="The smart account that owns your stipends. Agents never hold this key."
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader
            title="Owner account"
            description={
              kind === "passkey"
                ? `Signed in with passkey “${label}”`
                : "Signed in with a development key"
            }
            action={
              <Pill tone="neutral" dot>
                {appConfig.chainLabel}
              </Pill>
            }
          />
          <CardBody className="pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md border border-line bg-paper-2 px-2.5 py-1.5 font-mono text-[13px]">
                <span className="sm:hidden">{shortAddress(address, 6)}</span>
                <span className="hidden sm:inline">{address}</span>
              </code>
              <Button
                size="sm"
                variant="secondary"
                onClick={copy}
                leading={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
              {explorer && (
                <a href={explorer} target="_blank" rel="noreferrer">
                  <Button
                    size="sm"
                    variant="ghost"
                    trailing={<ExternalLink className="size-3.5" />}
                  >
                    Explorer
                  </Button>
                </a>
              )}
            </div>

            <DefinitionList
              className="mt-5"
              items={[
                {
                  term: `${appConfig.token.symbol} balance`,
                  detail: balance.isPending ? (
                    <Skeleton className="h-4 w-20" />
                  ) : balance.isError ? (
                    <span className="text-ink-3">unavailable</span>
                  ) : (
                    <Money>
                      {formatAmount(balance.data!, appConfig.token.decimals)}{" "}
                      {appConfig.token.symbol}
                    </Money>
                  ),
                },
                { term: "Gas", detail: "Sponsored. You do not need ETH." },
                { term: "Account type", detail: "ZeroDev Kernel v3.1" },
              ]}
            />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          {appConfig.testnet && (
            <Card>
              <CardHeader
                title="Get test funds"
                description={`Stipends hold ${appConfig.token.symbol}. Send some to the address above.`}
              />
              <CardBody className="pt-3">
                <ul className="space-y-2 text-sm">
                  {faucets.map((f) => (
                    <li key={f.href}>
                      <a
                        href={f.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-ink hover:underline"
                      >
                        {f.label} <ExternalLink className="size-3.5 text-ink-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Session"
              description="Signing out forgets this device. Your stipends stay onchain and your passkey still opens the account."
            />
            <CardBody className="pt-3">
              <Button variant="secondary" leading={<LogOut className="size-4" />} onClick={signOut}>
                Sign out
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
