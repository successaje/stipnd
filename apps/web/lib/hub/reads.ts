import { erc20Abi, type Address } from "viem";
import {
  merchantRegistryAbi,
  stipendHubAbi,
  type Merchant,
  type MerchantMode,
  type Stipend,
} from "@stipnd/protocol";
import { publicClient } from "../clients";
import { appConfig } from "../config";

function toStipend(
  id: bigint,
  raw: {
    owner: Address;
    token: Address;
    balance: bigint;
    spentThisPeriod: bigint;
    periodStart: number;
    frozen: boolean;
    policy: {
      periodBudget: bigint;
      periodLength: number;
      perCallCap: bigint;
      maxCallsPerWindow: number;
      rateWindow: number;
      maxSameResource: number;
      duplicateWindow: number;
      minMerchantSettlements: number;
      merchantMode: number;
      expiresAt: number;
    };
    name: string;
    purpose: string;
  },
): Stipend {
  return {
    id,
    owner: raw.owner,
    token: raw.token,
    balance: raw.balance,
    spentThisPeriod: raw.spentThisPeriod,
    periodStart: Number(raw.periodStart),
    frozen: raw.frozen,
    policy: {
      periodBudget: raw.policy.periodBudget,
      periodLength: Number(raw.policy.periodLength),
      perCallCap: raw.policy.perCallCap,
      maxCallsPerWindow: Number(raw.policy.maxCallsPerWindow),
      rateWindow: Number(raw.policy.rateWindow),
      maxSameResource: Number(raw.policy.maxSameResource),
      duplicateWindow: Number(raw.policy.duplicateWindow),
      minMerchantSettlements: Number(raw.policy.minMerchantSettlements),
      merchantMode: raw.policy.merchantMode as MerchantMode,
      expiresAt: Number(raw.policy.expiresAt),
    },
    name: raw.name,
    purpose: raw.purpose,
  };
}

export async function fetchStipendIds(owner: Address): Promise<bigint[]> {
  const ids = await publicClient().readContract({
    address: appConfig.hub,
    abi: stipendHubAbi,
    functionName: "stipendsOf",
    args: [owner],
  });
  return [...ids].reverse(); // newest first
}

export async function fetchStipend(id: bigint): Promise<Stipend> {
  const raw = await publicClient().readContract({
    address: appConfig.hub,
    abi: stipendHubAbi,
    functionName: "getStipend",
    args: [id],
  });
  return toStipend(id, raw);
}

export async function fetchStipends(ids: bigint[]): Promise<Stipend[]> {
  if (ids.length === 0) return [];
  const results = await publicClient().multicall({
    contracts: ids.map((id) => ({
      address: appConfig.hub,
      abi: stipendHubAbi,
      functionName: "getStipend" as const,
      args: [id] as const,
    })),
    allowFailure: false,
  });
  return results.map((raw, i) => toStipend(ids[i]!, raw));
}

export interface StipendLive {
  remainingThisPeriod: bigint;
  periodEndsAt: number;
  ok: boolean;
  reason: number;
}

/** Period-aware remaining budget, as the hub would compute it right now. */
export async function fetchStipendLive(id: bigint): Promise<StipendLive> {
  const p = await publicClient().readContract({
    address: appConfig.hub,
    abi: stipendHubAbi,
    functionName: "preview",
    args: [id, "0x0000000000000000000000000000000000000000", 0n, `0x${"0".repeat(64)}`],
  });
  return {
    remainingThisPeriod: p.remainingThisPeriod,
    periodEndsAt: Number(p.periodEndsAt),
    ok: p.ok,
    reason: Number(p.reason),
  };
}

export async function fetchTokenBalance(owner: Address): Promise<bigint> {
  return publicClient().readContract({
    address: appConfig.token.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [owner],
  });
}

export async function fetchAllowance(owner: Address): Promise<bigint> {
  return publicClient().readContract({
    address: appConfig.token.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, appConfig.hub],
  });
}

export async function fetchMerchants(): Promise<Merchant[]> {
  const client = publicClient();
  const count = await client.readContract({
    address: appConfig.registry,
    abi: merchantRegistryAbi,
    functionName: "count",
  });
  if (count === 0n) return [];
  const addresses = await client.readContract({
    address: appConfig.registry,
    abi: merchantRegistryAbi,
    functionName: "list",
    args: [0n, count],
  });
  const rows = await client.multicall({
    contracts: addresses.map((a) => ({
      address: appConfig.registry,
      abi: merchantRegistryAbi,
      functionName: "get" as const,
      args: [a] as const,
    })),
    allowFailure: false,
  });
  return rows.map((m, i) => ({
    address: addresses[i]!,
    name: m.name,
    url: m.url,
    tags: m.tags
      ? m.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    registeredAt: Number(m.registeredAt),
    settlements: Number(m.settlements),
    volume: m.volume,
    erc8004AgentId: m.erc8004AgentId,
  }));
}

export async function fetchMerchant(address: Address): Promise<Merchant | null> {
  const m = await publicClient().readContract({
    address: appConfig.registry,
    abi: merchantRegistryAbi,
    functionName: "get",
    args: [address],
  });
  if (Number(m.registeredAt) === 0) return null;
  return {
    address,
    name: m.name,
    url: m.url,
    tags: m.tags
      ? m.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    registeredAt: Number(m.registeredAt),
    settlements: Number(m.settlements),
    volume: m.volume,
    erc8004AgentId: m.erc8004AgentId,
  };
}
