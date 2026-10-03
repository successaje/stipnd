import { createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { createPublicClient, http, type PublicClient } from "viem";
import { getChainInfo, type Credential } from "@stipnd/protocol";
import { ENTRY_POINT, KERNEL_VERSION } from "./constants";
import { StipndError } from "./errors";
import type { Submitter } from "./submitter";

export interface KernelSubmitterOptions {
  publicClient?: PublicClient;
  /** Max time to wait for inclusion. */
  timeoutMs?: number;
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
  const publicClient =
    options.publicClient ??
    createPublicClient({
      chain: info.chain,
      transport: http(credential.rpcUrl),
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
      const hash = await kernelClient.sendUserOperation({
        callData: await account.encodeCalls([{ to: call.to, value: 0n, data: call.data }]),
      });
      const receipt = await kernelClient.waitForUserOperationReceipt({
        hash,
        timeout: options.timeoutMs ?? 120_000,
      });
      return {
        txHash: receipt.receipt.transactionHash,
        success: receipt.success,
        logs: receipt.logs,
      };
    },
  };
}
