import { decodeEventLog, isAddressEqual, type Address, type Hex, type Log } from "viem";
import { RejectReason, stipendHubAbi, type Receipt } from "@stipnd/protocol";

type MinimalLog = Pick<Log, "address" | "data" | "topics"> & {
  transactionHash: Hex | null;
  logIndex: number | null;
  blockNumber: bigint | null;
};

/**
 * Turns hub logs into receipts. Logs from other contracts and unrelated hub events
 * are ignored. Works on `getLogs` results and on transaction receipt logs alike.
 */
export function receiptsFromLogs(logs: readonly MinimalLog[], hub: Address): Receipt[] {
  const out: Receipt[] = [];
  for (const log of logs) {
    if (!isAddressEqual(log.address, hub)) continue;
    if (!log.transactionHash || log.logIndex === null || log.blockNumber === null) continue;
    let decoded: ReturnType<typeof decodeEventLog<typeof stipendHubAbi>>;
    try {
      decoded = decodeEventLog({ abi: stipendHubAbi, data: log.data, topics: log.topics });
    } catch {
      continue;
    }
    const base = {
      id: `${log.transactionHash}:${log.logIndex}`,
      txHash: log.transactionHash,
      logIndex: log.logIndex,
      blockNumber: log.blockNumber,
    };
    if (decoded.eventName === "Paid") {
      const a = decoded.args;
      out.push({
        ...base,
        stipendId: a.id,
        status: "paid",
        merchant: a.merchant,
        amount: a.amount,
        resourceHash: a.resourceHash,
        memo: a.memo,
        remainingThisPeriod: a.remainingThisPeriod,
        balance: a.balance,
      });
    } else if (decoded.eventName === "PaymentRejected") {
      const a = decoded.args;
      out.push({
        ...base,
        stipendId: a.id,
        status: "rejected",
        merchant: a.merchant,
        amount: a.amount,
        resourceHash: a.resourceHash,
        reason: a.reason as RejectReason,
      });
    }
  }
  return out;
}

/** The single receipt a `pay()` transaction produced for a stipend, if any. */
export function findPaymentReceipt(
  logs: readonly MinimalLog[],
  hub: Address,
  stipendId: bigint,
): Receipt | null {
  return receiptsFromLogs(logs, hub).find((r) => r.stipendId === stipendId) ?? null;
}
