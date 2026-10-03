import { isAddress, type Address } from "viem";
import { getChainInfo, getDeployment } from "@stipnd/protocol";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

function address(name: string): Address {
  const v = required(name);
  if (!isAddress(v)) throw new Error(`${name} is not a valid address: ${v}`);
  return v;
}

export interface MerchantConfig {
  port: number;
  publicUrl: string;
  chainId: number;
  rpcUrl: string;
  hub: Address;
  merchant: Address;
  token: Address;
  tokenDecimals: number;
  tokenSymbol: string;
  /** Seconds a challenge stays valid. */
  challengeTtl: number;
  /** Seconds after a payment block during which proofs are accepted. */
  proofMaxAge: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): MerchantConfig {
  const chainId = Number(env.MERCHANT_CHAIN_ID ?? env.NEXT_PUBLIC_CHAIN_ID ?? 421614);
  const info = getChainInfo(chainId);
  const known = getDeployment(chainId);
  const token =
    env.MERCHANT_TOKEN_ADDRESS ??
    env.NEXT_PUBLIC_TOKEN_ADDRESS ??
    known?.token.address ??
    info.defaultToken?.address;
  if (!token || !isAddress(token))
    throw new Error("Set MERCHANT_TOKEN_ADDRESS (or NEXT_PUBLIC_TOKEN_ADDRESS).");
  const hub = env.MERCHANT_HUB_ADDRESS ?? env.NEXT_PUBLIC_STIPEND_HUB_ADDRESS ?? known?.stipendHub;
  if (!hub || !isAddress(hub))
    throw new Error("Set MERCHANT_HUB_ADDRESS (or NEXT_PUBLIC_STIPEND_HUB_ADDRESS).");
  return {
    port: Number(env.MERCHANT_PORT ?? 4020),
    publicUrl: (env.MERCHANT_PUBLIC_URL ?? `http://localhost:${env.MERCHANT_PORT ?? 4020}`).replace(
      /\/$/,
      "",
    ),
    chainId,
    rpcUrl: env.MERCHANT_RPC_URL ?? env.NEXT_PUBLIC_RPC_URL ?? info.chain.rpcUrls.default.http[0]!,
    hub,
    merchant: address("MERCHANT_ADDRESS"),
    token,
    tokenDecimals: Number(
      env.MERCHANT_TOKEN_DECIMALS ??
        env.NEXT_PUBLIC_TOKEN_DECIMALS ??
        info.defaultToken?.decimals ??
        6,
    ),
    tokenSymbol:
      env.MERCHANT_TOKEN_SYMBOL ??
      env.NEXT_PUBLIC_TOKEN_SYMBOL ??
      info.defaultToken?.symbol ??
      "USD",
    challengeTtl: Number(env.MERCHANT_CHALLENGE_TTL ?? 600),
    proofMaxAge: Number(env.MERCHANT_PROOF_MAX_AGE ?? 900),
  };
}
