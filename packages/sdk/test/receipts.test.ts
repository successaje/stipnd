import { describe, expect, it } from "vitest";
import { RejectReason, resourceHash } from "@stipnd/protocol";
import { receiptsFromLogs, findPaymentReceipt } from "../src";
import { HUB, MERCHANT, paidLog, rejectedLog } from "./helpers";

const res = resourceHash("GET", "https://m.example/reports/1");

describe("receiptsFromLogs", () => {
  it("decodes Paid and PaymentRejected and ignores other addresses", () => {
    const paid = paidLog({
      id: 7n,
      merchant: MERCHANT,
      amount: 400_000n,
      resourceHash: res,
      memo: "r1",
    });
    const rejected = rejectedLog({
      id: 7n,
      merchant: MERCHANT,
      amount: 5_000_000n,
      resourceHash: res,
      reason: RejectReason.PerCallCap,
    });
    const foreign = { ...paid, address: MERCHANT };
    const receipts = receiptsFromLogs([paid, rejected, foreign], HUB);
    expect(receipts).toHaveLength(2);
    expect(receipts[0]).toMatchObject({
      status: "paid",
      amount: 400_000n,
      memo: "r1",
      stipendId: 7n,
    });
    expect(receipts[1]).toMatchObject({ status: "rejected", reason: RejectReason.PerCallCap });
  });

  it("finds the receipt for a specific stipend", () => {
    const other = paidLog({ id: 8n, merchant: MERCHANT, amount: 1n, resourceHash: res });
    const mine = paidLog({ id: 7n, merchant: MERCHANT, amount: 2n, resourceHash: res });
    expect(findPaymentReceipt([other, mine], HUB, 7n)?.amount).toBe(2n);
    expect(findPaymentReceipt([other], HUB, 7n)).toBeNull();
  });
});
