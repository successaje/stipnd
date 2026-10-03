import {
  CallPolicyVersion,
  ParamCondition,
  toCallPolicy,
  toGasPolicy,
  toRateLimitPolicy,
  toTimestampPolicy,
} from "@zerodev/permissions/policies";
import type { Policy as KernelPolicy } from "@zerodev/permissions";
import type { Address } from "viem";
import { stipendHubAbi } from "@stipnd/protocol";

export interface SessionPolicyParams {
  hub: Address;
  stipendId: bigint;
  /** Mirrors the stipend's per-call cap. Enforced by the account before the hub sees the call. */
  perCallCap: bigint;
  /** Optional outer rate limit. Give the hub room to record a few rejections first. */
  maxCallsPerWindow?: number;
  rateWindow?: number;
  /** Unix seconds. 0 or undefined means no expiry at the account layer. */
  expiresAt?: number;
  /** Policy start, unix seconds. Defaults to now. Exposed so tests are deterministic. */
  now?: number;
}

/** Extra calls the account layer tolerates beyond the hub's limit, so rejections can still be recorded. */
export const RATE_LIMIT_HEADROOM = 3;

/**
 * The Kernel permission attached to an agent's session key. It is the first enforcement
 * layer: the key can only call `StipendHub.pay` for this stipend id with `amount <= cap`,
 * only within the window, only with sponsored gas, and only until expiry.
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
    // The session key may only send sponsored operations; it can never spend the account's ETH.
    toGasPolicy({ enforcePaymaster: true }),
  ];

  if (p.maxCallsPerWindow && p.rateWindow) {
    policies.push(
      toRateLimitPolicy({
        count: p.maxCallsPerWindow + RATE_LIMIT_HEADROOM,
        interval: p.rateWindow,
        startAt: p.now ?? Math.floor(Date.now() / 1000),
      }),
    );
  }

  if (p.expiresAt && p.expiresAt > 0) {
    policies.push(toTimestampPolicy({ validUntil: p.expiresAt }));
  }

  return policies;
}
