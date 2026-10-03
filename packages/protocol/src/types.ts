import type { Address, Hex } from "viem";

/** Mirrors `IStipendHub.MerchantMode`. */
export const MerchantMode = {
  Any: 0,
  Allowlist: 1,
  Verified: 2,
  VerifiedOrAllowlist: 3,
} as const;
export type MerchantMode = (typeof MerchantMode)[keyof typeof MerchantMode];

/** Mirrors `IStipendHub.RejectReason`. Zero means accepted. */
export const RejectReason = {
  None: 0,
  Frozen: 1,
  Expired: 2,
  PerCallCap: 3,
  PeriodBudget: 4,
  InsufficientBalance: 5,
  RateLimit: 6,
  DuplicateResource: 7,
  MerchantNotAllowed: 8,
  MerchantNotVerified: 9,
  MerchantTooNew: 10,
} as const;
export type RejectReason = (typeof RejectReason)[keyof typeof RejectReason];

/** Short, human copy for each rejection. Used in receipts and agent errors. */
export const REJECT_COPY: Record<RejectReason, { title: string; detail: string }> = {
  [RejectReason.None]: { title: "Accepted", detail: "Payment went through." },
  [RejectReason.Frozen]: {
    title: "Stipend frozen",
    detail: "The owner froze this stipend. Nothing can be paid until it is unfrozen.",
  },
  [RejectReason.Expired]: {
    title: "Stipend expired",
    detail: "This stipend passed its expiry date.",
  },
  [RejectReason.PerCallCap]: {
    title: "Over the per-call cap",
    detail: "This single payment is larger than the stipend allows for one call.",
  },
  [RejectReason.PeriodBudget]: {
    title: "Period budget used up",
    detail: "The stipend has spent its budget for this period. It refills at the next period.",
  },
  [RejectReason.InsufficientBalance]: {
    title: "Not enough funds",
    detail: "The stipend's balance is lower than this payment. Top it up to continue.",
  },
  [RejectReason.RateLimit]: {
    title: "Too many payments",
    detail: "The stipend hit its calls-per-window limit. It resets when the window ends.",
  },
  [RejectReason.DuplicateResource]: {
    title: "Repeat purchase blocked",
    detail:
      "The same resource was bought too many times in a short window. This usually means a loop.",
  },
  [RejectReason.MerchantNotAllowed]: {
    title: "Merchant not on allowlist",
    detail: "This stipend only pays merchants the owner listed.",
  },
  [RejectReason.MerchantNotVerified]: {
    title: "Merchant not verified",
    detail: "This stipend only pays merchants registered in the Stipnd directory.",
  },
  [RejectReason.MerchantTooNew]: {
    title: "Merchant too new",
    detail: "This merchant does not yet have enough settled payments for this stipend's policy.",
  },
};

export interface Policy {
  periodBudget: bigint;
  periodLength: number;
  perCallCap: bigint;
  maxCallsPerWindow: number;
  rateWindow: number;
  maxSameResource: number;
  duplicateWindow: number;
  minMerchantSettlements: number;
  merchantMode: MerchantMode;
  expiresAt: number;
}

export interface Stipend {
  id: bigint;
  owner: Address;
  token: Address;
  balance: bigint;
  spentThisPeriod: bigint;
  periodStart: number;
  frozen: boolean;
  policy: Policy;
  name: string;
  purpose: string;
}

export type ReceiptStatus = "paid" | "rejected";

/** One payment attempt, derived from `Paid` or `PaymentRejected` events. */
export interface Receipt {
  id: string; // `${txHash}:${logIndex}`
  stipendId: bigint;
  status: ReceiptStatus;
  merchant: Address;
  amount: bigint;
  resourceHash: Hex;
  memo?: string;
  reason?: RejectReason;
  remainingThisPeriod?: bigint;
  balance?: bigint;
  txHash: Hex;
  logIndex: number;
  blockNumber: bigint;
  timestamp?: number;
}

export interface Merchant {
  address: Address;
  name: string;
  url: string;
  tags: string[];
  registeredAt: number;
  settlements: number;
  volume: bigint;
  erc8004AgentId: bigint;
}
