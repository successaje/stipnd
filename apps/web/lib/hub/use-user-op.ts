"use client";

import * as React from "react";
import type { Address, Hex, Log } from "viem";
import type { TxStage } from "@/components/ui/tx-stages";
import { humanizeError } from "../errors";
import { useReadyAccount } from "../account/provider";

export interface Call {
  to: Address;
  data: Hex;
  value?: bigint;
}

export interface UserOpResult {
  txHash: Hex;
  logs: readonly Log[];
}

/**
 * Sends a batch of calls from the owner's smart account as one sponsored user operation
 * and exposes the stage for the UI: preparing → signing → submitted → confirming → done.
 */
export function useUserOp() {
  const { kernelClient, account } = useReadyAccount();
  const [stage, setStage] = React.useState<TxStage>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [txHash, setTxHash] = React.useState<Hex | null>(null);

  const reset = React.useCallback(() => {
    setStage("idle");
    setError(null);
    setTxHash(null);
  }, []);

  const run = React.useCallback(
    async (calls: Call[]): Promise<UserOpResult> => {
      setError(null);
      setTxHash(null);
      setStage("preparing");
      try {
        const callData = await account.encodeCalls(
          calls.map((c) => ({ to: c.to, data: c.data, value: c.value ?? 0n })),
        );
        setStage("signing");
        const hash = await kernelClient.sendUserOperation({ callData });
        setStage("submitted");
        setStage("confirming");
        const receipt = await kernelClient.waitForUserOperationReceipt({ hash, timeout: 120_000 });
        if (!receipt.success) {
          throw new Error("UserOperation reverted");
        }
        setTxHash(receipt.receipt.transactionHash);
        setStage("done");
        return { txHash: receipt.receipt.transactionHash, logs: receipt.logs };
      } catch (e) {
        console.error(e);
        setError(humanizeError(e));
        setStage("error");
        throw e;
      }
    },
    [account, kernelClient],
  );

  return {
    run,
    stage,
    error,
    txHash,
    reset,
    busy: stage !== "idle" && stage !== "done" && stage !== "error",
  };
}
