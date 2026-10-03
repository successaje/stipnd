#!/usr/bin/env tsx
/**
 * Registers (or updates) this merchant in the Stipnd MerchantRegistry so stipends in
 * "verified" mode can pay it. Merchants are servers, so this runs from the server's key.
 *
 *   MERCHANT_PRIVATE_KEY=0x… pnpm --filter @stipnd/merchant register \
 *     --name "Filings API" --url https://filings.example --tags data,search
 */
import "dotenv/config";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChainInfo, getDeployment, merchantRegistryAbi } from "@stipnd/protocol";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const pk = process.env.MERCHANT_PRIVATE_KEY as Hex | undefined;
if (!pk) {
  console.error("Set MERCHANT_PRIVATE_KEY (the key for MERCHANT_ADDRESS).");
  process.exit(1);
}
const name = arg("name");
const url = arg("url") ?? process.env.MERCHANT_PUBLIC_URL ?? "";
const tags = arg("tags") ?? "data";
if (!name) {
  console.error("Pass --name. Optional: --url, --tags (comma separated).");
  process.exit(1);
}

const chainId = Number(process.env.MERCHANT_CHAIN_ID ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? 421614);
const info = getChainInfo(chainId);
const registryEnv =
  (process.env.MERCHANT_REGISTRY_ADDRESS as `0x${string}` | undefined) ??
  (process.env.NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS as `0x${string}` | undefined) ??
  getDeployment(chainId)?.merchantRegistry;
if (!registryEnv) {
  console.error("No MerchantRegistry address for this chain. Set MERCHANT_REGISTRY_ADDRESS.");
  process.exit(1);
}
const registry: `0x${string}` = registryEnv;

const account = privateKeyToAccount(pk);
const rpc = process.env.MERCHANT_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL;
const publicClient = createPublicClient({ chain: info.chain, transport: http(rpc) });
const wallet = createWalletClient({ account, chain: info.chain, transport: http(rpc) });

async function main() {
  const existing = await publicClient.readContract({
    address: registry,
    abi: merchantRegistryAbi,
    functionName: "get",
    args: [account.address],
  });
  const registered = Number(existing.registeredAt) > 0;
  console.log(`${registered ? "Updating" : "Registering"} ${account.address} on ${info.label}`);
  console.log(`  name ${name}\n  url  ${url || "(none)"}\n  tags ${tags}`);

  const hash = await wallet.writeContract({
    address: registry,
    abi: merchantRegistryAbi,
    functionName: registered ? "update" : "register",
    args: [name!, url, tags],
  });
  console.log(`  tx   ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(
    receipt.status === "success"
      ? "Done. Verified mode can now pay this merchant."
      : "Transaction reverted.",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
