"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { isAddress, type Address } from "viem";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { formatAmount, MerchantMode, parseAmount, type Policy } from "@stipnd/protocol";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/field";
import { Money } from "@/components/ui/status";
import { TxStages } from "@/components/ui/tx-stages";
import { useReadyAccount } from "@/lib/account/provider";
import { appConfig, faucets } from "@/lib/config";
import { qk, useTokenBalance } from "@/lib/hub/hooks";
import { useUserOp } from "@/lib/hub/use-user-op";
import { approveCall, createStipendCall, stipendIdFromLogs } from "@/lib/hub/writes";
import { policySentences } from "@/lib/policy-text";

const PERIODS = [
  { value: "86400", label: "day" },
  { value: "604800", label: "week" },
  { value: "2592000", label: "30 days" },
  { value: "0", label: "one-time" },
];
const WINDOWS = [
  { value: "3600", label: "hour" },
  { value: "86400", label: "day" },
];
const EXPIRIES = [
  { value: "0", label: "Never" },
  { value: "30", label: "In 30 days" },
  { value: "90", label: "In 90 days" },
  { value: "365", label: "In a year" },
];

type Form = {
  name: string;
  purpose: string;
  budget: string;
  period: string;
  perCall: string;
  rateOn: boolean;
  rateCount: string;
  rateWindow: string;
  dupOn: boolean;
  dupCount: string;
  dupWindow: string;
  merchantMode: MerchantMode;
  allowlist: string;
  minSettlements: string;
  expiryDays: string;
  funding: string;
};

const initial: Form = {
  name: "",
  purpose: "",
  budget: "60",
  period: "2592000",
  perCall: "0.50",
  rateOn: true,
  rateCount: "120",
  rateWindow: "3600",
  dupOn: true,
  dupCount: "3",
  dupWindow: "3600",
  merchantMode: MerchantMode.Any,
  allowlist: "",
  minSettlements: "0",
  expiryDays: "0",
  funding: "60",
};

function parseForm(
  f: Form,
  decimals: number,
): {
  policy: Policy;
  allowlist: Address[];
  funding: bigint;
  errors: Partial<Record<keyof Form, string>>;
} {
  const errors: Partial<Record<keyof Form, string>> = {};
  const num = (v: string, key: keyof Form) => {
    try {
      const n = parseAmount(v, decimals);
      if (n <= 0n) errors[key] = "Must be greater than zero";
      return n;
    } catch (e) {
      errors[key] = (e as Error).message;
      return 0n;
    }
  };
  if (!f.name.trim()) errors.name = "Give it a name";
  if (new TextEncoder().encode(f.name).length > 64) errors.name = "Keep it under 64 characters";
  if (new TextEncoder().encode(f.purpose).length > 160)
    errors.purpose = "Keep it under 160 characters";

  const periodBudget = num(f.budget, "budget");
  const perCallCap = num(f.perCall, "perCall");
  if (!errors.perCall && !errors.budget && perCallCap > periodBudget)
    errors.perCall = "Cap can't exceed the budget";

  const rateCount = f.rateOn ? Number(f.rateCount) : 0;
  if (f.rateOn && (!Number.isInteger(rateCount) || rateCount <= 0))
    errors.rateCount = "Whole number above zero";
  const dupCount = f.dupOn ? Number(f.dupCount) : 0;
  if (f.dupOn && (!Number.isInteger(dupCount) || dupCount <= 0 || dupCount > 65535))
    errors.dupCount = "Whole number above zero";

  const allowlist = f.allowlist
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = allowlist.find((a) => !isAddress(a));
  if (bad) errors.allowlist = `Not an address: ${bad.slice(0, 12)}…`;
  const needsAllowlist = f.merchantMode === MerchantMode.Allowlist;
  if (needsAllowlist && allowlist.length === 0)
    errors.allowlist = "Add at least one merchant address";

  const minSettlements = Number(f.minSettlements || 0);
  if (!Number.isInteger(minSettlements) || minSettlements < 0)
    errors.minSettlements = "Whole number";

  let funding = 0n;
  if (f.funding.trim()) {
    try {
      funding = parseAmount(f.funding, decimals);
    } catch (e) {
      errors.funding = (e as Error).message;
    }
  }

  const expiryDays = Number(f.expiryDays);
  const expiresAt = expiryDays > 0 ? Math.floor(Date.now() / 1000) + expiryDays * 86400 : 0;

  return {
    policy: {
      periodBudget,
      periodLength: Number(f.period),
      perCallCap,
      maxCallsPerWindow: rateCount,
      rateWindow: f.rateOn ? Number(f.rateWindow) : 0,
      maxSameResource: dupCount,
      duplicateWindow: f.dupOn ? Number(f.dupWindow) : 0,
      minMerchantSettlements: minSettlements,
      merchantMode: f.merchantMode,
      expiresAt,
    },
    allowlist: allowlist as Address[],
    funding,
    errors,
  };
}

export function NewStipendForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const { address } = useReadyAccount();
  const balance = useTokenBalance(address);
  const { run, stage, error, reset, busy } = useUserOp();
  const [f, setF] = React.useState<Form>(initial);
  const [touched, setTouched] = React.useState(false);
  const { symbol, decimals } = appConfig.token;

  const parsed = React.useMemo(() => parseForm(f, decimals), [f, decimals]);
  const errors = touched ? parsed.errors : {};
  const hasErrors = Object.keys(parsed.errors).length > 0;
  const insufficient = balance.data !== undefined && parsed.funding > balance.data;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (hasErrors || insufficient) return;
    try {
      const calls = [];
      if (parsed.funding > 0n) calls.push(approveCall(parsed.funding));
      calls.push(
        createStipendCall({
          name: f.name.trim(),
          purpose: f.purpose.trim(),
          policy: parsed.policy,
          allowlist: parsed.allowlist,
          initialFunding: parsed.funding,
        }),
      );
      const { logs } = await run(calls);
      const id = stipendIdFromLogs(logs);
      await qc.invalidateQueries({ queryKey: qk.stipends(address) });
      await qc.invalidateQueries({ queryKey: qk.balance(address) });
      toast.success(`“${f.name.trim()}” is live`, {
        description:
          parsed.funding > 0n
            ? `Funded with ${formatAmount(parsed.funding, decimals)} ${symbol}.`
            : "Fund it before connecting an agent.",
      });
      router.push(id ? `/app/s/${id.toString()}` : "/app");
    } catch {
      /* error is rendered by TxStages */
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
            <Field label="Name" htmlFor="name" error={errors.name}>
              <Input
                id="name"
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Research bot"
                invalid={!!errors.name}
                autoFocus
              />
            </Field>
            <Field
              label="Purpose"
              htmlFor="purpose"
              hint="Shown on receipts so you remember why this exists."
              error={errors.purpose}
            >
              <Textarea
                id="purpose"
                value={f.purpose}
                onChange={(e) => set("purpose", e.target.value)}
                placeholder="Buys filings, quotes and news for the weekly competitor brief."
                rows={2}
                invalid={!!errors.purpose}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Budget" description="The hub refuses anything past these numbers." />
          <CardBody className="grid gap-4 pt-4 sm:grid-cols-2">
            <Field label="Amount" htmlFor="budget" error={errors.budget}>
              <Input
                id="budget"
                inputMode="decimal"
                mono
                value={f.budget}
                onChange={(e) => set("budget", e.target.value)}
                suffix={symbol}
                invalid={!!errors.budget}
              />
            </Field>
            <Field label="Refills every" htmlFor="period">
              <Select id="period" value={f.period} onChange={(e) => set("period", e.target.value)}>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Per-call cap"
              htmlFor="perCall"
              hint="The largest single payment allowed."
              error={errors.perCall}
            >
              <Input
                id="perCall"
                inputMode="decimal"
                mono
                value={f.perCall}
                onChange={(e) => set("perCall", e.target.value)}
                suffix={symbol}
                invalid={!!errors.perCall}
              />
            </Field>
            <Field label="Expires" htmlFor="expiry">
              <Select
                id="expiry"
                value={f.expiryDays}
                onChange={(e) => set("expiryDays", e.target.value)}
              >
                {EXPIRIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Guards"
            description="Rate limits bound mistakes. The loop guard catches an agent buying the same thing over and over."
          />
          <CardBody className="grid gap-5 pt-4">
            <Toggle label="Rate limit" checked={f.rateOn} onChange={(v) => set("rateOn", v)}>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input
                  inputMode="numeric"
                  mono
                  value={f.rateCount}
                  onChange={(e) => set("rateCount", e.target.value)}
                  invalid={!!errors.rateCount}
                  aria-label="Max payments"
                />
                <span className="text-sm text-ink-3">payments per</span>
                <Select
                  value={f.rateWindow}
                  onChange={(e) => set("rateWindow", e.target.value)}
                  aria-label="Rate window"
                >
                  {WINDOWS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </Select>
              </div>
              {errors.rateCount && <p className="mt-1 text-xs text-refuse">{errors.rateCount}</p>}
            </Toggle>
            <Toggle label="Loop guard" checked={f.dupOn} onChange={(v) => set("dupOn", v)}>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input
                  inputMode="numeric"
                  mono
                  value={f.dupCount}
                  onChange={(e) => set("dupCount", e.target.value)}
                  invalid={!!errors.dupCount}
                  aria-label="Max repeats"
                />
                <span className="text-sm text-ink-3">same resource per</span>
                <Select
                  value={f.dupWindow}
                  onChange={(e) => set("dupWindow", e.target.value)}
                  aria-label="Duplicate window"
                >
                  {WINDOWS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </Select>
              </div>
              {errors.dupCount && <p className="mt-1 text-xs text-refuse">{errors.dupCount}</p>}
            </Toggle>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Merchants" description="Who this stipend may pay." />
          <CardBody className="grid gap-4 pt-4">
            <Segmented
              ariaLabel="Merchant policy"
              value={String(f.merchantMode) as "0" | "1" | "2" | "3"}
              onChange={(v) => set("merchantMode", Number(v) as MerchantMode)}
              options={[
                { value: "0", label: "Any" },
                { value: "1", label: "Allowlist" },
                { value: "2", label: "Verified" },
                { value: "3", label: "Verified or allowlist" },
              ]}
              className="flex-wrap"
            />
            {(f.merchantMode === MerchantMode.Allowlist ||
              f.merchantMode === MerchantMode.VerifiedOrAllowlist) && (
              <Field
                label="Allowlisted addresses"
                htmlFor="allowlist"
                hint="One per line or comma separated."
                error={errors.allowlist}
              >
                <Textarea
                  id="allowlist"
                  value={f.allowlist}
                  onChange={(e) => set("allowlist", e.target.value)}
                  placeholder="0x…"
                  rows={3}
                  className="font-mono text-[13px]"
                  invalid={!!errors.allowlist}
                />
              </Field>
            )}
            {(f.merchantMode === MerchantMode.Verified ||
              f.merchantMode === MerchantMode.VerifiedOrAllowlist) && (
              <Field
                label="Minimum settled payments"
                htmlFor="minSettlements"
                hint="Require a track record before a verified merchant can be paid. 0 means any verified merchant."
                error={errors.minSettlements}
              >
                <Input
                  id="minSettlements"
                  inputMode="numeric"
                  mono
                  value={f.minSettlements}
                  onChange={(e) => set("minSettlements", e.target.value)}
                  invalid={!!errors.minSettlements}
                  className="max-w-40"
                />
              </Field>
            )}
          </CardBody>
        </Card>

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
                errors.funding ??
                (insufficient
                  ? `Your account holds ${formatAmount(balance.data!, decimals)} ${symbol}.`
                  : undefined)
              }
            >
              <Input
                id="funding"
                inputMode="decimal"
                mono
                value={f.funding}
                onChange={(e) => set("funding", e.target.value)}
                suffix={symbol}
                invalid={!!errors.funding || insufficient}
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
                {parsed.funding > 0n
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

function Toggle({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="relative inline-flex h-6 w-10 items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="absolute inset-0 rounded-full bg-paper-3 transition-colors peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30" />
          <span className="absolute left-0.5 size-5 rounded-full bg-surface shadow-card transition-transform peer-checked:translate-x-4" />
        </span>
      </label>
      {checked && <div className="mt-3">{children}</div>}
    </div>
  );
}
