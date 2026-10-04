import { createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { createPublicClient, http, type PublicClient } from "viem";
import { getChainInfo, type Credential } from "@stipnd/protocol";
import { ENTRY_POINT, KERNEL_VERSION } from "./constants";
import { StipndError } from "./errors";
import type { Submitter } from "./submitter";

const TRANSIENT =
  /verificationGasLimit must be at least|AA25|nonce too low|replacement underpriced/i;

/**
 * Bundler estimation can hiccup right after a previous operation lands (the sponsor's
 * simulation briefly returns placeholder gas limits). Back off and retry.
 */
async function withTransientRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!TRANSIENT.test(msg) || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 3_000 * (i + 1)));
    }
  }
  throw last;
}

export interface KernelSubmitterOptions {
  publicClient?: PublicClient;
  /** Max time to wait for inclusion. */
  timeoutMs?: number;
  /** Pause after inclusion before returning, so back-to-back operations estimate cleanly. */
  settleMs?: number;
}

/**
 * Builds a `Submitter` from a credential: deserializes the scoped session account and
 * wires a ZeroDev bundler + paymaster so the agent never needs gas.
 */
export async function createKernelSubmitter(
  credential: Credential,
  options: KernelSubmitterOptions = {},
): Promise<Submitter & { publicClient: PublicClient }> {
  const info = getChainInfo(credential.chainId);
  // Estimation and nonce reads go through the bundler's own RPC so back-to-back operations
  // never see a stale nonce from a lagging public node.
  const publicClient =
    options.publicClient ??
    createPublicClient({
      chain: info.chain,
      transport: http(credential.bundlerUrl),
    });

  const account = await deserializePermissionAccount(
    publicClient,
    ENTRY_POINT,
    KERNEL_VERSION,
    credential.approval,
  );

  if (account.address.toLowerCase() !== credential.account.toLowerCase()) {
    throw new StipndError(
      "CREDENTIAL",
      "Credential account does not match the deserialized session account.",
    );
  }

  const paymaster = createZeroDevPaymasterClient({
    chain: info.chain,
    transport: http(credential.bundlerUrl),
  });

  const kernelClient = createKernelAccountClient({
    account,
    chain: info.chain,
    bundlerTransport: http(credential.bundlerUrl),
    client: publicClient,
    paymaster: {
      getPaymasterData: (userOperation) => paymaster.sponsorUserOperation({ userOperation }),
    },
  });

  return {
    account: account.address,
    publicClient,
    async submit(call) {
      const callData = await account.encodeCalls([{ to: call.to, value: 0n, data: call.data }]);
      const hash = await withTransientRetry(() => kernelClient.sendUserOperation({ callData }));
      const receipt = await kernelClient.waitForUserOperationReceipt({
        hash,
        timeout: options.timeoutMs ?? 120_000,
      });
      // Let the bundler's view settle before the next estimation.
      await new Promise((r) => setTimeout(r, options.settleMs ?? 1_500));
      return {
        txHash: receipt.receipt.transactionHash,
        success: receipt.success,
        logs: receipt.logs,
      };
    },
  };
}
