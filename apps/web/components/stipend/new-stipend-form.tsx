"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { formatAmount, parseAmount } from "@stipnd/protocol";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Money } from "@/components/ui/status";
import { TxStages } from "@/components/ui/tx-stages";
import { useReadyAccount } from "@/lib/account/provider";
import { appConfig, faucets } from "@/lib/config";
import { qk, useTokenBalance } from "@/lib/hub/hooks";
import { useUserOp } from "@/lib/hub/use-user-op";
import { approveCall, createStipendCall, stipendIdFromLogs } from "@/lib/hub/writes";
import { policySentences } from "@/lib/policy-text";
import { PolicyFields } from "./policy-fields";
import { defaultPolicyForm, parsePolicyForm, type PolicyForm } from "./policy-form";

export function NewStipendForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const { address } = useReadyAccount();
  const balance = useTokenBalance(address);
  const { run, stage, error, reset, busy } = useUserOp();
  const { symbol, decimals } = appConfig.token;

  const [name, setName] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [funding, setFunding] = React.useState("60");
  const [policy, setPolicy] = React.useState<PolicyForm>(defaultPolicyForm);
  const [touched, setTouched] = React.useState(false);

  const parsed = React.useMemo(() => parsePolicyForm(policy, decimals), [policy, decimals]);

  const metaErrors: { name?: string; purpose?: string; funding?: string } = {};
  if (!name.trim()) metaErrors.name = "Give it a name";
  else if (new TextEncoder().encode(name).length > 64)
    metaErrors.name = "Keep it under 64 characters";
  if (new TextEncoder().encode(purpose).length > 160)
    metaErrors.purpose = "Keep it under 160 characters";
  let fundingAmount = 0n;
  if (funding.trim()) {
    try {
      fundingAmount = parseAmount(funding, decimals);
    } catch (e) {
      metaErrors.funding = (e as Error).message;
    }
  }
  const insufficient = balance.data !== undefined && fundingAmount > balance.data;
  const hasErrors = Object.keys(parsed.errors).length > 0 || Object.keys(metaErrors).length > 0;
  const shownMeta = touched ? metaErrors : {};
  const shownPolicy = touched ? parsed.errors : {};

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (hasErrors || insufficient) return;
    try {
      const calls = [];
      if (fundingAmount > 0n) calls.push(approveCall(fundingAmount));
      calls.push(
        createStipendCall({
          name: name.trim(),
          purpose: purpose.trim(),
          policy: parsed.policy,
          allowlist: parsed.allowlist,
          initialFunding: fundingAmount,
        }),
      );
      const { logs } = await run(calls);
      const id = stipendIdFromLogs(logs);
      await qc.invalidateQueries({ queryKey: qk.stipends(address) });
      await qc.invalidateQueries({ queryKey: qk.balance(address) });
      toast.success(`“${name.trim()}” is live`, {
        description:
          fundingAmount > 0n
            ? `Funded with ${formatAmount(fundingAmount, decimals)} ${symbol}. Next: connect an agent.`
            : "Fund it before connecting an agent.",
      });
      router.push(id ? `/app/s/${id.toString()}` : "/app");
    } catch {
      /* rendered by TxStages */
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start"
    >
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="What is this budget for?" />
          <CardBody className="grid gap-4 pt-4">
            <Field label="Name" htmlFor="name" error={shownMeta.name}>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Research bot"
                invalid={!!shownMeta.name}
                autoFocus
              />
            </Field>
            <Field
              label="Purpose"
              htmlFor="purpose"
              hint="Shown on the stipend so you remember why it exists."
              error={shownMeta.purpose}
            >
              <Textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Buys filings, quotes and news for the weekly competitor brief."
                rows={2}
                invalid={!!shownMeta.purpose}
              />
            </Field>
          </CardBody>
        </Card>

        <PolicyFields value={policy} onChange={setPolicy} errors={shownPolicy} />

        <Card>
          <CardHeader
            title="Initial funding"
            description="Moves tokens from your account into the stipend. You can top up later."
          />
          <CardBody className="grid gap-3 pt-4">
            <Field
              label="Amount"
              htmlFor="funding"
              aside={
                balance.data !== undefined ? (
                  <>
                    Account balance{" "}
                    <Money>
                      {formatAmount(balance.data, decimals)} {symbol}
                    </Money>
                  </>
                ) : null
              }
              error={
                shownMeta.funding ??
                (insufficient
                  ? `Your account holds ${formatAmount(balance.data!, decimals)} ${symbol}.`
                  : undefined)
              }
            >
              <Input
                id="funding"
                inputMode="decimal"
                mono
                value={funding}
                onChange={(e) => setFunding(e.target.value)}
                suffix={symbol}
                invalid={!!shownMeta.funding || insufficient}
              />
            </Field>
            {insufficient && faucets[0] && (
              <p className="text-xs text-ink-3">
                Testnet: get {symbol} from the{" "}
                <a
                  href={faucets[0].href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-ink hover:underline"
                >
                  {faucets[0].label} <ExternalLink className="size-3" />
                </a>{" "}
                and send it to your account address.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-20">
        <Card>
          <CardHeader title="In plain words" />
          <CardBody className="pt-3">
            <ul className="space-y-2 text-sm leading-6 text-ink-2">
              {policySentences(parsed.policy).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2.5 size-1 shrink-0 rounded-full bg-ink-3" aria-hidden />
                  {s}
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-line pt-4">
              {stage !== "idle" && <TxStages stage={stage} error={error} className="mb-4" />}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={busy}
                loadingLabel="Creating…"
                disabled={touched && (hasErrors || insufficient)}
              >
                Create stipend
              </Button>
              {stage === "error" && (
                <Button type="button" variant="ghost" className="mt-2 w-full" onClick={reset}>
                  Dismiss
                </Button>
              )}
              <p className="mt-3 text-xs leading-5 text-ink-3">
                One passkey confirmation.{" "}
                {fundingAmount > 0n
                  ? "Approval and creation happen in a single sponsored transaction."
                  : "Gas is sponsored."}
              </p>
            </div>
          </CardBody>
        </Card>
      </aside>
    </form>
  );
}
