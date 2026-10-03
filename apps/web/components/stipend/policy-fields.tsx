"use client";

import * as React from "react";
import { MerchantMode } from "@stipnd/protocol";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/field";
import { appConfig } from "@/lib/config";
import { EXPIRIES, PERIODS, WINDOWS, type PolicyErrors, type PolicyForm } from "./policy-form";

export interface PolicyFieldsProps {
  value: PolicyForm;
  onChange: (next: PolicyForm) => void;
  errors: PolicyErrors;
  /** Hide the expiry control (editing keeps the hub's expiry semantics simple). */
  hideExpiry?: boolean;
  /** Render without card chrome, for use inside a dialog. */
  flat?: boolean;
}

/** The budget, guards, and merchant sections. Used by the create form and the edit dialog. */
export function PolicyFields({ value: f, onChange, errors, hideExpiry, flat }: PolicyFieldsProps) {
  const { symbol } = appConfig.token;
  const set = <K extends keyof PolicyForm>(k: K, v: PolicyForm[K]) => onChange({ ...f, [k]: v });
  const Section = flat ? FlatSection : CardSection;

  return (
    <>
      <Section title="Budget" description="The hub refuses anything past these numbers.">
        <div className="grid gap-4 sm:grid-cols-2">
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
          {!hideExpiry && (
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
          )}
        </div>
      </Section>

      <Section
        title="Guards"
        description="Rate limits bound mistakes. The loop guard catches an agent buying the same thing over and over."
      >
        <div className="grid gap-5">
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
        </div>
      </Section>

      <Section title="Merchants" description="Who this stipend may pay.">
        <div className="grid gap-4">
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
        </div>
      </Section>
    </>
  );
}

function CardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody className="pt-4">{children}</CardBody>
    </Card>
  );
}

function FlatSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h4 className="text-sm font-semibold">{title}</h4>
      {description && <p className="mb-3 mt-0.5 text-xs text-ink-3">{description}</p>}
      {children}
    </section>
  );
}

export function Toggle({
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
