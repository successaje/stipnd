import { isAddressEqual, type Address, type Hex, type PublicClient } from "viem";
import { findPaymentReceipt } from "@stipnd/sdk";
import type { PaymentProof } from "@stipnd/protocol";

export interface VerifyParams {
  proof: PaymentProof;
  expected: {
    chainId: number;
    hub: Address;
    merchant: Address;
    resourceHash: Hex;
    amount: bigint;
  };
  /** Reject payments older than this many seconds. */
  maxAgeSeconds: number;
  /** How long to wait for the RPC to see the transaction. */
  receiptTimeoutMs?: number;
  now?: number;
}

export type VerifyResult =
  | { ok: true; txHash: Hex; logIndex: number; amount: bigint; stipendId: bigint }
  | { ok: false; status: 402 | 409; reason: string };

/**
 * Checks that a proof points at a real `Paid` event that pays this merchant for this
 * resource with at least the asked amount, recently, and that it has not been redeemed.
 */
export async function verifyProof(
  client: PublicClient,
  redeemed: RedemptionStore,
  p: VerifyParams,
): Promise<VerifyResult> {
  const { proof, expected } = p;
  if (proof.chainId !== expected.chainId) {
    return { ok: false, status: 402, reason: "Proof is for a different chain." };
  }
  const key = `${proof.txHash}:${proof.logIndex}`;
  if (await redeemed.has(key)) {
    return { ok: false, status: 409, reason: "This payment was already redeemed." };
  }

  // The agent's bundler usually sees the transaction before a public RPC does. Wait briefly
  // instead of refusing a payment that is seconds old.
  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({
      hash: proof.txHash as Hex,
      timeout: p.receiptTimeoutMs ?? 15_000,
      pollingInterval: 1_000,
    });
  } catch {
    return {
      ok: false,
      status: 402,
      reason: "Payment transaction not found yet. Retry in a moment.",
    };
  }
  if (receipt.status !== "success") {
    return { ok: false, status: 402, reason: "Payment transaction reverted." };
  }

  const stipendId = BigInt(proof.stipendId);
  const paid = findPaymentReceipt(receipt.logs, expected.hub, stipendId);
  if (!paid || paid.logIndex !== proof.logIndex) {
    return { ok: false, status: 402, reason: "No matching stipend payment in that transaction." };
  }
  if (paid.status !== "paid") {
    return { ok: false, status: 402, reason: "That attempt was rejected by the stipend." };
  }
  if (!isAddressEqual(paid.merchant, expected.merchant)) {
    return { ok: false, status: 402, reason: "Payment went to a different merchant." };
  }
  if (paid.resourceHash.toLowerCase() !== expected.resourceHash.toLowerCase()) {
    return { ok: false, status: 402, reason: "Payment was for a different resource." };
  }
  if (paid.amount < expected.amount) {
    return { ok: false, status: 402, reason: "Payment is smaller than the price." };
  }

  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  const now = p.now ?? Math.floor(Date.now() / 1000);
  if (now - Number(block.timestamp) > p.maxAgeSeconds) {
    return { ok: false, status: 402, reason: "Payment is too old for this resource." };
  }

  await redeemed.add(key);
  return { ok: true, txHash: paid.txHash, logIndex: paid.logIndex, amount: paid.amount, stipendId };
}

/** Prevents one payment from unlocking a resource twice. In-memory for the reference merchant. */
export interface RedemptionStore {
  has(key: string): Promise<boolean>;
  add(key: string): Promise<void>;
}

export function memoryRedemptionStore(): RedemptionStore {
  const set = new Set<string>();
  return {
    async has(key) {
      return set.has(key);
    },
    async add(key) {
      set.add(key);
    },
  };
}
