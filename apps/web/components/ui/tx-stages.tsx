"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type TxStage =
  "idle" | "preparing" | "signing" | "submitted" | "confirming" | "done" | "error";

export const STAGE_ORDER: TxStage[] = ["preparing", "signing", "submitted", "confirming", "done"];

export const STAGE_LABEL: Record<Exclude<TxStage, "idle" | "error">, string> = {
  preparing: "Preparing",
  signing: "Waiting for your passkey",
  submitted: "Submitted",
  confirming: "Confirming onchain",
  done: "Done",
};

/**
 * Staged transaction feedback. Shows where a user operation is instead of a spinner.
 * `signing` is only shown when the owner's key must prompt (not for session keys).
 */
export function TxStages({
  stage,
  error,
  hideSigning,
  className,
}: {
  stage: TxStage;
  error?: string | null;
  hideSigning?: boolean;
  className?: string;
}) {
  if (stage === "idle") return null;
  const order = hideSigning ? STAGE_ORDER.filter((s) => s !== "signing") : STAGE_ORDER;
  const currentIndex = stage === "error" ? -1 : order.indexOf(stage);
  return (
    <ol className={cn("flex flex-col gap-2", className)} aria-live="polite">
      {order.map((s, i) => {
        const done = currentIndex > i || stage === "done";
        const active = currentIndex === i && stage !== "done";
        return (
          <li key={s} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px]",
                done && "border-money bg-money text-white",
                active && "border-ink text-ink",
                !done && !active && "border-line text-ink-4",
              )}
            >
              {done ? (
                <Check className="size-3" />
              ) : active ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                i + 1
              )}
            </span>
            <span className={cn(done || active ? "text-ink" : "text-ink-4")}>
              {STAGE_LABEL[s as keyof typeof STAGE_LABEL]}
            </span>
          </li>
        );
      })}
      {stage === "error" && error && (
        <li
          className="mt-1 rounded-md border border-refuse/30 bg-refuse-soft px-3 py-2 text-sm text-refuse-ink"
          role="alert"
        >
          {error}
        </li>
      )}
    </ol>
  );
}
