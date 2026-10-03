"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, Snowflake, Sun } from "lucide-react";
import { toast } from "sonner";
import { formatAmount, parseAmount, type Stipend } from "@stipnd/protocol";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Money } from "@/components/ui/status";
import { TxStages } from "@/components/ui/tx-stages";
import { useReadyAccount } from "@/lib/account/provider";
import { appConfig } from "@/lib/config";
import { qk, useTokenBalance } from "@/lib/hub/hooks";
import { useUserOp } from "@/lib/hub/use-user-op";
import { approveCall, fundCall, setFrozenCall, withdrawCall } from "@/lib/hub/writes";

function useInvalidate(id: bigint) {
  const qc = useQueryClient();
  const { address } = useReadyAccount();
  return React.useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.stipend(id.toString()) }),
      qc.invalidateQueries({ queryKey: qk.live(id.toString()) }),
      qc.invalidateQueries({ queryKey: qk.stipends(address) }),
      qc.invalidateQueries({ queryKey: qk.balance(address) }),
    ]);
  }, [qc, id, address]);
}

/** Freeze is the kill switch. It is always one tap away and never behind a dialog. */
export function FreezeButton({ s }: { s: Stipend }) {
  const { run, busy } = useUserOp();
  const invalidate = useInvalidate(s.id);
  async function toggle() {
    try {
      await run([setFrozenCall(s.id, !s.frozen)]);
      await invalidate();
      toast.success(s.frozen ? "Stipend unfrozen" : "Stipend frozen", {
        description: s.frozen
          ? "Agents can pay from it again."
          : "Every payment attempt will be refused until you unfreeze.",
      });
    } catch {
      toast.error(s.frozen ? "Couldn't unfreeze" : "Couldn't freeze", {
        description: "Nothing changed. Try again.",
      });
    }
  }
  return s.frozen ? (
    <Button
      variant="secondary"
      leading={<Sun className="size-4" />}
      loading={busy}
      loadingLabel="Unfreezing…"
      onClick={toggle}
    >
      Unfreeze
    </Button>
  ) : (
    <Button
      variant="danger"
      leading={<Snowflake className="size-4" />}
      loading={busy}
      loadingLabel="Freezing…"
      onClick={toggle}
    >
      Freeze
    </Button>
  );
}

export function FundDialog({ s }: { s: Stipend }) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("20");
  const { address } = useReadyAccount();
  const balance = useTokenBalance(address);
  const { run, stage, error, reset, busy } = useUserOp();
  const invalidate = useInvalidate(s.id);
  const { decimals, symbol } = appConfig.token;

  let parsed = 0n;
  let err: string | undefined;
  try {
    parsed = amount.trim() ? parseAmount(amount, decimals) : 0n;
    if (parsed <= 0n) err = "Enter an amount";
  } catch (e) {
    err = (e as Error).message;
  }
  const insufficient = balance.data !== undefined && parsed > balance.data;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (err || insufficient) return;
    try {
      await run([approveCall(parsed), fundCall(s.id, parsed)]);
      await invalidate();
      toast.success(`Added ${formatAmount(parsed, decimals)} ${symbol}`);
      setOpen(false);
      reset();
    } catch {
      /* TxStages shows it */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button
        variant="secondary"
        leading={<ArrowDownToLine className="size-4" />}
        onClick={() => setOpen(true)}
      >
        Add funds
      </Button>
      <DialogContent
        title="Add funds"
        description="Moves tokens from your account into this stipend."
      >
        <form onSubmit={submit} noValidate className="grid gap-4">
          <Field
            label="Amount"
            htmlFor="fund-amount"
            aside={
              balance.data !== undefined ? (
                <>
                  Account{" "}
                  <Money>
                    {formatAmount(balance.data, decimals)} {symbol}
                  </Money>
                </>
              ) : null
            }
            error={err ?? (insufficient ? "More than your account holds." : undefined)}
          >
            <Input
              id="fund-amount"
              inputMode="decimal"
              mono
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              suffix={symbol}
              invalid={!!err || insufficient}
              autoFocus
            />
          </Field>
          {stage !== "idle" && <TxStages stage={stage} error={error} />}
          <Button
            type="submit"
            size="lg"
            loading={busy}
            loadingLabel="Adding…"
            disabled={!!err || insufficient}
          >
            Add {parsed > 0n && !err ? `${formatAmount(parsed, decimals)} ${symbol}` : "funds"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WithdrawDialog({ s }: { s: Stipend }) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const { address } = useReadyAccount();
  const { run, stage, error, reset, busy } = useUserOp();
  const invalidate = useInvalidate(s.id);
  const { decimals, symbol } = appConfig.token;

  let parsed = 0n;
  let err: string | undefined;
  try {
    parsed = amount.trim() ? parseAmount(amount, decimals) : 0n;
    if (parsed <= 0n) err = "Enter an amount";
    else if (parsed > s.balance)
      err = `The stipend holds ${formatAmount(s.balance, decimals)} ${symbol}.`;
  } catch (e) {
    err = (e as Error).message;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (err) return;
    try {
      await run([withdrawCall(s.id, parsed, address)]);
      await invalidate();
      toast.success(`Returned ${formatAmount(parsed, decimals)} ${symbol} to your account`);
      setOpen(false);
      reset();
    } catch {
      /* TxStages shows it */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button
        variant="ghost"
        leading={<ArrowUpFromLine className="size-4" />}
        onClick={() => setOpen(true)}
        disabled={s.balance === 0n}
      >
        Withdraw
      </Button>
      <DialogContent
        title="Withdraw"
        description="Returns tokens from the stipend to your account. Agents can no longer spend what you take out."
      >
        <form onSubmit={submit} noValidate className="grid gap-4">
          <Field
            label="Amount"
            htmlFor="withdraw-amount"
            aside={
              <button
                type="button"
                className="text-ink hover:underline"
                onClick={() =>
                  setAmount(formatAmount(s.balance, decimals, decimals).replace(/,/g, ""))
                }
              >
                Max {formatAmount(s.balance, decimals)}
              </button>
            }
            error={amount ? err : undefined}
          >
            <Input
              id="withdraw-amount"
              inputMode="decimal"
              mono
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              suffix={symbol}
              invalid={!!amount && !!err}
              autoFocus
            />
          </Field>
          {stage !== "idle" && <TxStages stage={stage} error={error} />}
          <Button
            type="submit"
            size="lg"
            variant="secondary"
            loading={busy}
            loadingLabel="Withdrawing…"
            disabled={!!err}
          >
            Withdraw
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
