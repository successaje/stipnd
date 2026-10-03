import { encodeFunctionData, erc20Abi, type Address } from "viem";
import { stipendHubAbi, type Policy } from "@stipnd/protocol";
import { appConfig } from "../config";
import type { Call } from "./use-user-op";

export function approveCall(amount: bigint): Call {
  return {
    to: appConfig.token.address,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [appConfig.hub, amount],
    }),
  };
}

export function createStipendCall(p: {
  name: string;
  purpose: string;
  policy: Policy;
  allowlist: Address[];
  initialFunding: bigint;
}): Call {
  return {
    to: appConfig.hub,
    data: encodeFunctionData({
      abi: stipendHubAbi,
      functionName: "create",
      args: [
        appConfig.token.address,
        p.name,
        p.purpose,
        {
          periodBudget: p.policy.periodBudget,
          periodLength: p.policy.periodLength,
          perCallCap: p.policy.perCallCap,
          maxCallsPerWindow: p.policy.maxCallsPerWindow,
          rateWindow: p.policy.rateWindow,
          maxSameResource: p.policy.maxSameResource,
          duplicateWindow: p.policy.duplicateWindow,
          minMerchantSettlements: p.policy.minMerchantSettlements,
          merchantMode: p.policy.merchantMode,
          expiresAt: p.policy.expiresAt,
        },
        p.allowlist,
        p.initialFunding,
      ],
    }),
  };
}

export function fundCall(id: bigint, amount: bigint): Call {
  return {
    to: appConfig.hub,
    data: encodeFunctionData({ abi: stipendHubAbi, functionName: "fund", args: [id, amount] }),
  };
}

export function withdrawCall(id: bigint, amount: bigint, to: Address): Call {
  return {
    to: appConfig.hub,
    data: encodeFunctionData({
      abi: stipendHubAbi,
      functionName: "withdraw",
      args: [id, amount, to],
    }),
  };
}

export function setFrozenCall(id: bigint, frozen: boolean): Call {
  return {
    to: appConfig.hub,
    data: encodeFunctionData({ abi: stipendHubAbi, functionName: "setFrozen", args: [id, frozen] }),
  };
}

export function updatePolicyCall(id: bigint, policy: Policy): Call {
  return {
    to: appConfig.hub,
    data: encodeFunctionData({
      abi: stipendHubAbi,
      functionName: "updatePolicy",
      args: [
        id,
        {
          periodBudget: policy.periodBudget,
          periodLength: policy.periodLength,
          perCallCap: policy.perCallCap,
          maxCallsPerWindow: policy.maxCallsPerWindow,
          rateWindow: policy.rateWindow,
          maxSameResource: policy.maxSameResource,
          duplicateWindow: policy.duplicateWindow,
          minMerchantSettlements: policy.minMerchantSettlements,
          merchantMode: policy.merchantMode,
          expiresAt: policy.expiresAt,
        },
      ],
    }),
  };
}

export function setAllowlistCall(id: bigint, merchants: Address[], allowed: boolean): Call {
  return {
    to: appConfig.hub,
    data: encodeFunctionData({
      abi: stipendHubAbi,
      functionName: "setAllowlist",
      args: [id, merchants, allowed],
    }),
  };
}

/** The stipend id from a `create` transaction's logs. */
export function stipendIdFromLogs(
  logs: readonly { address: Address; topics: readonly `0x${string}`[] }[],
): bigint | null {
  // StipendCreated(uint256 indexed id, address indexed owner, address indexed token, ...)
  const created = logs.find(
    (l) =>
      l.address.toLowerCase() === appConfig.hub.toLowerCase() &&
      l.topics[0] === STIPEND_CREATED_TOPIC,
  );
  if (!created || !created.topics[1]) return null;
  return BigInt(created.topics[1]);
}

import { toEventSelector } from "viem";
const STIPEND_CREATED_TOPIC = toEventSelector(
  "StipendCreated(uint256,address,address,string,string,(uint128,uint32,uint128,uint32,uint32,uint16,uint32,uint32,uint8,uint40))",
);
