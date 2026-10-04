import {
  CallPolicyVersion,
  ParamCondition,
  toCallPolicy,
  toGasPolicy,
  toTimestampPolicy,
} from "@zerodev/permissions/policies";
import type { Policy as KernelPolicy } from "@zerodev/permissions";
import { parseEther, type Address } from "viem";
import { stipendHubAbi } from "@stipnd/protocol";

export interface SessionPolicyParams {
  hub: Address;
  stipendId: bigint;
  /** Mirrors the stipend's per-call cap. Enforced by the account before the hub sees the call. */
  perCallCap: bigint;
  /** Kept for compatibility with stored issuance records; rate limiting is enforced by the hub. */
  maxCallsPerWindow?: number;
  rateWindow?: number;
  /** Unix seconds. 0 or undefined means no expiry at the account layer. */
  expiresAt?: number;
  /** Policy start, unix seconds. Defaults to now. Exposed so tests are deterministic. */
  now?: number;
}

/**
 * Total gas (in wei of the account's own ETH) a session key may ever consume. Operations are
 * normally sponsored, so this only matters if someone sends ETH to the account; it keeps a
 * leaked key from burning it. Kernel's gas policy treats a zero allowance as "nothing", so a
 * concrete number is required.
 */
export const SESSION_GAS_ALLOWANCE = parseEther("0.02");

/**
 * The Kernel permission attached to an agent's session key. It is the first enforcement
 * layer: the key can only call `StipendHub.pay` for this stipend id with `amount <= cap`,
 * with a bounded gas allowance, and only until expiry.
 */
export function buildSessionPolicies(p: SessionPolicyParams): KernelPolicy[] {
  const policies: KernelPolicy[] = [
    toCallPolicy({
      policyVersion: CallPolicyVersion.V0_0_4,
      permissions: [
        {
          target: p.hub,
          valueLimit: 0n,
          abi: stipendHubAbi,
          functionName: "pay",
          args: [
            { condition: ParamCondition.EQUAL, value: p.stipendId },
            null,
            { condition: ParamCondition.LESS_THAN_OR_EQUAL, value: p.perCallCap },
            null,
            null,
          ],
        },
      ],
    }),
    // Bounded gas allowance so a leaked key cannot burn ETH that lands in the account.
    toGasPolicy({ allowed: SESSION_GAS_ALLOWANCE }),
  ];

  // Rate limiting is deliberately left to the hub: it refuses onchain with a receipt the owner can
  // see, while Kernel's rate-limit policy fails silently at validation ("AA22 expired or not due")
  // and would hide the loop from the receipts feed.

  if (p.expiresAt && p.expiresAt > 0) {
    policies.push(toTimestampPolicy({ validUntil: p.expiresAt }));
  }

  return policies;
}
