import { isAddress, type Address } from "viem";
import { CHAINS, getChainInfo, getDeployment, zeroDevRpc } from "@stipnd/protocol";

/**
 * Public configuration, read once from NEXT_PUBLIC_* at build time.
 * `configStatus` tells the UI what is missing so the app can explain itself
 * instead of failing deep inside a wallet call.
 */
const env = {
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  hub: process.env.NEXT_PUBLIC_STIPEND_HUB_ADDRESS,
  registry: process.env.NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS,
  token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS,
  tokenSymbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL,
  tokenDecimals: process.env.NEXT_PUBLIC_TOKEN_DECIMALS,
  projectId: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID,
  bundler: process.env.NEXT_PUBLIC_BUNDLER_RPC,
  paymaster: process.env.NEXT_PUBLIC_PAYMASTER_RPC,
  passkeyServer: process.env.NEXT_PUBLIC_PASSKEY_SERVER_URL,
  deployBlock: process.env.NEXT_PUBLIC_HUB_DEPLOY_BLOCK,
  devSigner: process.env.NEXT_PUBLIC_ENABLE_DEV_SIGNER,
  merchantUrl: process.env.NEXT_PUBLIC_MERCHANT_URL,
};

const chainId = Number(env.chainId ?? 421614);
const chainInfo = CHAINS[chainId] ? getChainInfo(chainId) : undefined;
const known = getDeployment(chainId);

function addr(v: string | undefined): Address | undefined {
  return v && isAddress(v) ? v : undefined;
}

const missing: string[] = [];
if (!chainInfo) missing.push("NEXT_PUBLIC_CHAIN_ID (unsupported chain)");
const hub = addr(env.hub) ?? known?.stipendHub;
if (!hub) missing.push("NEXT_PUBLIC_STIPEND_HUB_ADDRESS");
const registry = addr(env.registry) ?? known?.merchantRegistry;
if (!registry) missing.push("NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS");
const tokenAddress = addr(env.token) ?? known?.token.address ?? chainInfo?.defaultToken?.address;
if (!tokenAddress) missing.push("NEXT_PUBLIC_TOKEN_ADDRESS");
const projectId = env.projectId;
const bundlerUrl = env.bundler || (projectId ? zeroDevRpc(projectId, chainId) : undefined);
if (!bundlerUrl) missing.push("NEXT_PUBLIC_ZERODEV_PROJECT_ID (or NEXT_PUBLIC_BUNDLER_RPC)");

export const appConfig = {
  chainId,
  chain: chainInfo?.chain,
  chainLabel: chainInfo?.label ?? `Chain ${chainId}`,
  explorer: chainInfo?.explorer ?? "",
  testnet: chainInfo?.testnet ?? true,
  rpcUrl: env.rpcUrl || chainInfo?.chain.rpcUrls.default.http[0] || "",
  hub: hub as Address,
  registry: registry as Address,
  token: {
    address: tokenAddress as Address,
    symbol: env.tokenSymbol || chainInfo?.defaultToken?.symbol || "USD",
    decimals: Number(env.tokenDecimals ?? chainInfo?.defaultToken?.decimals ?? 6),
  },
  zerodevProjectId: projectId,
  bundlerUrl: bundlerUrl as string,
  paymasterUrl: env.paymaster || (bundlerUrl as string),
  passkeyServerUrl:
    env.passkeyServer || (projectId ? `https://passkeys.zerodev.app/api/v3/${projectId}` : ""),
  deployBlock: env.deployBlock ? BigInt(env.deployBlock) : (known?.deployBlock ?? 0n),
  devSignerEnabled: env.devSigner === "true",
  merchantUrl: env.merchantUrl || "",
} as const;

export const configStatus: { ok: boolean; missing: string[] } = {
  ok: missing.length === 0,
  missing,
};

/** Public faucets for the configured testnet, shown on the account page. */
export const faucets =
  chainId === 421614
    ? [
        { label: "Circle USDC faucet", href: "https://faucet.circle.com/" },
        {
          label: "Arbitrum Sepolia ETH (not needed for Stipnd, gas is sponsored)",
          href: "https://www.alchemy.com/faucets/arbitrum-sepolia",
        },
      ]
    : [];
