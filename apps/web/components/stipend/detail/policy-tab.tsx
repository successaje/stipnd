"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "viem";
import { MerchantMode, type Stipend } from "@stipnd/protocol";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TxStages } from "@/components/ui/tx-stages";
import { useReadyAccount } from "@/lib/account/provider";
import { appConfig } from "@/lib/config";
import { qk } from "@/lib/hub/hooks";
import { useUserOp } from "@/lib/hub/use-user-op";
import { setAllowlistCall, updatePolicyCall } from "@/lib/hub/writes";
import { policySentences } from "@/lib/policy-text";
import { PolicyFields } from "../policy-fields";
import { parsePolicyForm, policyToForm, type PolicyForm } from "../policy-form";

export function PolicyTab({ s }: { s: Stipend }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="px-4 py-5 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold">Current rules</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-2">
            {policySentences(s.policy).map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2.5 size-1 shrink-0 rounded-full bg-ink-3" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <Button
          variant="secondary"
          leading={<Pencil className="size-4" />}
          onClick={() => setOpen(true)}
        >
          Edit
        </Button>
      </div>
      <p className="mt-5 max-w-xl text-xs leading-5 text-ink-3">
        Changing rules starts a fresh period on the stipend. Credentials already issued keep their
        per-call cap at the account layer; issue new ones after lowering the cap if you want the
        tighter limit enforced twice.
      </p>
      <EditPolicyDialog s={s} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function EditPolicyDialog({
  s,
  open,
  onOpenChange,
}: {
  s: Stipend;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const { address } = useReadyAccount();
  const { run, stage, error, reset, busy } = useUserOp();
  const { decimals } = appConfig.token;
  const [form, setForm] = React.useState<PolicyForm>(() => policyToForm(s.policy, decimals));
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(policyToForm(s.policy, decimals));
      setTouched(false);
      reset();
    }
  }, [open, s.policy, decimals, reset]);

  const parsed = React.useMemo(() => parsePolicyForm(form, decimals), [form, decimals]);
  const hasErrors = Object.keys(parsed.errors).length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    try {
      const calls = [updatePolicyCall(s.id, parsed.policy)];
      const usesAllowlist =
        parsed.policy.merchantMode === MerchantMode.Allowlist ||
        parsed.policy.merchantMode === MerchantMode.VerifiedOrAllowlist;
      if (usesAllowlist && parsed.allowlist.length > 0) {
        calls.push(setAllowlistCall(s.id, parsed.allowlist as Address[], true));
      }
      await run(calls);
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.stipend(s.id.toString()) }),
        qc.invalidateQueries({ queryKey: qk.live(s.id.toString()) }),
        qc.invalidateQueries({ queryKey: qk.stipends(address) }),
      ]);
      toast.success("Rules updated", {
        description: "A fresh period started with the new budget.",
      });
      onOpenChange(false);
    } catch {
      /* TxStages shows it */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Edit rules"
        description="Applies on the next payment attempt."
        size="lg"
      >
        <form onSubmit={submit} noValidate className="grid gap-5">
          <PolicyFields
            value={form}
            onChange={setForm}
            errors={touched ? parsed.errors : {}}
            flat
          />
          <div className="rounded-md border border-line bg-paper-2/60 p-3">
            <p className="mb-1.5 text-xs font-medium text-ink-3">In plain words</p>
            <ul className="space-y-1 text-sm text-ink-2">
              {policySentences(parsed.policy).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
          {stage !== "idle" && <TxStages stage={stage} error={error} />}
          <Button
            type="submit"
            size="lg"
            loading={busy}
            loadingLabel="Saving…"
            disabled={touched && hasErrors}
          >
            Save rules
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
