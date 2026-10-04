import { createPublicClient, http, type PublicClient } from "viem";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  type KernelValidator,
} from "@zerodev/sdk";
import { ENTRY_POINT, KERNEL_VERSION } from "@stipnd/sdk";
import { appConfig } from "./config";

let _public: PublicClient | undefined;

export function publicClient(): PublicClient {
  if (!_public) {
    if (!appConfig.chain) throw new Error("Unsupported chain in configuration.");
    _public = createPublicClient({
      chain: appConfig.chain,
      transport: http(appConfig.rpcUrl, { batch: true }),
    });
  }
  return _public;
}

export type KernelClient = Awaited<ReturnType<typeof buildKernelClient>>["kernelClient"];
export type KernelAccount = Awaited<ReturnType<typeof buildKernelClient>>["account"];

let _bundlerReads: PublicClient | undefined;

/** Reads routed through the ZeroDev RPC, so estimation and nonces match the bundler's view. */
function bundlerReadClient(): PublicClient {
  if (!_bundlerReads) {
    _bundlerReads = createPublicClient({
      chain: appConfig.chain!,
      transport: http(appConfig.bundlerUrl),
    });
  }
  return _bundlerReads;
}

/** Owner account + client for a root validator (passkey or ECDSA). Gas is sponsored. */
export async function buildKernelClient(sudo: KernelValidator) {
  const client = bundlerReadClient();
  const chain = appConfig.chain!;
  const account = await createKernelAccount(client, {
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    plugins: { sudo },
  });
  const paymaster = createZeroDevPaymasterClient({
    chain,
    transport: http(appConfig.paymasterUrl),
  });
  const kernelClient = createKernelAccountClient({
    account,
    chain,
    client,
    bundlerTransport: http(appConfig.bundlerUrl),
    paymaster: {
      getPaymasterData: (userOperation) => paymaster.sponsorUserOperation({ userOperation }),
    },
  });
  return { account, kernelClient };
}
