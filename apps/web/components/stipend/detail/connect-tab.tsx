"use client";

import * as React from "react";
import { Check, Copy, KeyRound, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { issueCredential, permissionPluginForRevocation } from "@stipnd/sdk/owner";
import { formatAmount, shortAddress, type Stipend } from "@stipnd/protocol";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/status";
import { useReadyAccount } from "@/lib/account/provider";
import { publicClient } from "@/lib/clients";
import { appConfig } from "@/lib/config";
import { listIssued, markRevoked, recordIssued, type IssuedRecord } from "@/lib/credentials";
import { humanizeError } from "@/lib/errors";
import { relativeTime } from "@/lib/time";

type Snippet = "env" | "node" | "cli";

export function ConnectTab({ s }: { s: Stipend }) {
  const { sudoValidator, kernelClient } = useReadyAccount();
  const [label, setLabel] = React.useState("");
  const [issuing, setIssuing] = React.useState(false);
  const [issued, setIssued] = React.useState<{ credential: string; record: IssuedRecord } | null>(
    null,
  );
  const [history, setHistory] = React.useState<IssuedRecord[]>([]);
  const [snippet, setSnippet] = React.useState<Snippet>("env");
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const { decimals, symbol } = appConfig.token;

  React.useEffect(() => setHistory(listIssued(s.id.toString())), [s.id]);

  async function issue() {
    setIssuing(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const policy = {
        hub: appConfig.hub,
        stipendId: s.id,
        perCallCap: s.policy.perCallCap,
        maxCallsPerWindow: s.policy.maxCallsPerWindow || undefined,
        rateWindow: s.policy.rateWindow || undefined,
        expiresAt: s.policy.expiresAt || undefined,
        now,
      };
      const result = await issueCredential({
        client: publicClient(),
        sudoValidator,
        chainId: appConfig.chainId,
        bundlerUrl: appConfig.bundlerUrl,
        rpcUrl: appConfig.rpcUrl,
        token: appConfig.token.address,
        tokenDecimals: decimals,
        tokenSymbol: symbol,
        label: label.trim() || s.name,
        policy,
      });
      const record: IssuedRecord = {
        stipendId: s.id.toString(),
        label: label.trim() || s.name,
        sessionKeyAddress: result.sessionKeyAddress,
        permissionId: result.permissionId,
        issuedAt: Date.now(),
        policy: {
          perCallCap: s.policy.perCallCap.toString(),
          maxCallsPerWindow: s.policy.maxCallsPerWindow,
          rateWindow: s.policy.rateWindow,
          expiresAt: s.policy.expiresAt,
          now,
        },
      };
      recordIssued(record);
      setHistory(listIssued(s.id.toString()));
      setIssued({ credential: result.credential, record });
      setLabel("");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't issue a credential", { description: humanizeError(e) });
    } finally {
      setIssuing(false);
    }
  }

  async function revoke(r: IssuedRecord) {
    setRevoking(r.permissionId);
    try {
      const plugin = await permissionPluginForRevocation(publicClient(), r.sessionKeyAddress, {
        hub: appConfig.hub,
        stipendId: s.id,
        perCallCap: BigInt(r.policy.perCallCap),
        maxCallsPerWindow: r.policy.maxCallsPerWindow || undefined,
        rateWindow: r.policy.rateWindow || undefined,
        expiresAt: r.policy.expiresAt || undefined,
        now: r.policy.now,
      });
      const hash = await kernelClient.uninstallPlugin({ plugin });
      await kernelClient.waitForUserOperationReceipt({ hash, timeout: 120_000 });
      markRevoked(r.permissionId);
      setHistory(listIssued(s.id.toString()));
      toast.success("Credential revoked", {
        description: "That key can no longer pay from this stipend.",
      });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't revoke", { description: humanizeError(e) });
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="grid gap-6 px-4 py-5 sm:px-5">
      <section>
        <h3 className="text-[15px] font-semibold">Issue a credential</h3>
        <p className="mt-1 max-w-xl text-sm leading-6 text-ink-3">
          A credential is a key that can do exactly one thing: ask this stipend to pay, within its
          rules. It is not a wallet. Your passkey signs once to approve it. Shown once; issue a new
          one if you lose it.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field
            label="Label"
            htmlFor="cred-label"
            hint="Which agent will hold it."
            className="sm:w-72"
          >
            <Input
              id="cred-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={s.name}
            />
          </Field>
          <Button
            leading={<KeyRound className="size-4" />}
            loading={issuing}
            loadingLabel="Waiting for your passkey…"
            onClick={issue}
            disabled={s.frozen}
          >
            Issue credential
          </Button>
        </div>
        {s.frozen && (
          <p className="mt-2 text-xs text-refuse">
            Unfreeze the stipend before issuing credentials.
          </p>
        )}
      </section>

      {issued && (
        <section className="rounded-lg border border-money/30 bg-money-soft/40 p-4 animate-rise">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-money-ink">
              Credential for “{issued.record.label}”
            </p>
            <Pill tone="money" dot>
              Shown once
            </Pill>
          </div>
          <p className="mt-1 text-xs text-money-ink/80">
            Scoped to stipend #{s.id.toString()}, {formatAmount(s.policy.perCallCap, decimals)}{" "}
            {symbol} per call, sponsored gas only.
          </p>
          <div className="mt-3">
            <Segmented
              ariaLabel="Snippet format"
              value={snippet}
              onChange={setSnippet}
              options={[
                { value: "env", label: "Environment" },
                { value: "node", label: "TypeScript" },
                { value: "cli", label: "Demo agent" },
              ]}
            />
          </div>
          <CopyBlock text={snippetFor(snippet, issued.credential)} />
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setIssued(null)}>
            I've saved it
          </Button>
        </section>
      )}

      <section>
        <h3 className="text-[15px] font-semibold">Issued from this browser</h3>
        {history.length === 0 ? (
          <EmptyState
            className="px-0 py-6"
            title="No credentials yet"
            description="Credentials you issue here are listed so you can revoke them later. The credential string itself is never stored."
          />
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
            {history.map((r) => (
              <li key={r.permissionId} className="flex items-center gap-3 px-4 py-3">
                <KeyRound className="size-4 shrink-0 text-ink-3" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.label}</p>
                  <p className="truncate text-xs text-ink-3">
                    key {shortAddress(r.sessionKeyAddress)} · issued{" "}
                    {relativeTime(Math.floor(r.issuedAt / 1000))}
                  </p>
                </div>
                {r.revokedAt ? (
                  <Pill tone="neutral">Revoked</Pill>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    leading={<ShieldOff className="size-3.5" />}
                    loading={revoking === r.permissionId}
                    loadingLabel="Revoking…"
                    onClick={() => revoke(r)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-3">
          Freezing the stipend stops every credential at once. Revoking removes one key from the
          account for good.
        </p>
      </section>
    </div>
  );
}

function snippetFor(kind: Snippet, credential: string): string {
  switch (kind) {
    case "env":
      return `STIPND_CREDENTIAL=${credential}`;
    case "node":
      return `import { createStipndClient } from "@stipnd/sdk";

const stipnd = createStipndClient({ credential: "${credential}" });

// Pays Stipnd 402 challenges from the stipend and retries with proof.
const res = await stipnd.fetch("${appConfig.merchantUrl || "https://merchant.example"}/reports/42");`;
    case "cli":
      return `STIPND_CREDENTIAL=${credential} \\
STIPND_MERCHANT_URL=${appConfig.merchantUrl || "http://localhost:4020"} \\
pnpm agent normal   # or: overcap | loop | status`;
  }
}

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  }
  return (
    <div className="relative mt-3">
      <pre className="max-h-48 overflow-auto rounded-md border border-line bg-ink px-3 py-2.5 pr-20 font-mono text-[12px] leading-5 text-paper break-all whitespace-pre-wrap">
        {text}
      </pre>
      <Button
        size="sm"
        variant="secondary"
        className="absolute right-2 top-2"
        onClick={copy}
        leading={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
