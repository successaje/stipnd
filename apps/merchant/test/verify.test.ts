import { describe, expect, it } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  type Hex,
  type Log,
  type PublicClient,
} from "viem";
import { resourceHash, stipendHubAbi } from "@stipnd/protocol";
import { memoryRedemptionStore, verifyProof } from "../src/verify";

const HUB = "0x1000000000000000000000000000000000000001" as const;
const MERCHANT = "0x2000000000000000000000000000000000000002" as const;
const TX = `0x${"a".repeat(64)}` as const;
const RES = resourceHash("GET", "https://merchant.example/reports/42");

function paidLog(amount: bigint, logIndex = 0): Log {
  const topics = encodeEventTopics({
    abi: stipendHubAbi,
    eventName: "Paid",
    args: { id: 7n, merchant: MERCHANT, resourceHash: RES },
  }).filter((t): t is Hex => typeof t === "string");
  return {
    address: HUB,
    topics: topics as [Hex, ...Hex[]],
    data: encodeAbiParameters(
      [{ type: "uint128" }, { type: "string" }, { type: "uint128" }, { type: "uint128" }],
      [amount, "Report 42", 0n, 0n],
    ),
    transactionHash: TX,
    logIndex,
    blockNumber: 10n,
    blockHash: `0x${"1".repeat(64)}`,
    transactionIndex: 0,
    removed: false,
  };
}

function client(logs: Log[], blockAgeSeconds = 5): PublicClient {
  return {
    async waitForTransactionReceipt() {
      return { status: "success", blockNumber: 10n, logs };
    },
    async getBlock() {
      return { timestamp: BigInt(Math.floor(Date.now() / 1000) - blockAgeSeconds) };
    },
  } as unknown as PublicClient;
}

const expected = {
  chainId: 421614,
  hub: HUB,
  merchant: MERCHANT,
  resourceHash: RES,
  amount: 400_000n,
};
const proof = {
  scheme: "stipnd" as const,
  chainId: 421614,
  txHash: TX,
  logIndex: 0,
  stipendId: "7",
};

describe("verifyProof", () => {
  it("accepts a matching, fresh, unredeemed payment exactly once", async () => {
    const store = memoryRedemptionStore();
    const c = client([paidLog(400_000n)]);
    const first = await verifyProof(c, store, { proof, expected, maxAgeSeconds: 900 });
    expect(first.ok).toBe(true);
    const second = await verifyProof(c, store, { proof, expected, maxAgeSeconds: 900 });
    expect(second).toMatchObject({ ok: false, status: 409 });
  });

  it("rejects underpayment, wrong resource, and stale payments", async () => {
    const store = memoryRedemptionStore();
    const under = await verifyProof(client([paidLog(100n)]), store, {
      proof,
      expected,
      maxAgeSeconds: 900,
    });
    expect(under).toMatchObject({ ok: false, reason: expect.stringMatching(/smaller/) });

    const wrongRes = await verifyProof(client([paidLog(400_000n)]), store, {
      proof,
      expected: {
        ...expected,
        resourceHash: resourceHash("GET", "https://merchant.example/reports/1"),
      },
      maxAgeSeconds: 900,
    });
    expect(wrongRes).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/different resource/),
    });

    const stale = await verifyProof(client([paidLog(400_000n)], 10_000), store, {
      proof,
      expected,
      maxAgeSeconds: 900,
    });
    expect(stale).toMatchObject({ ok: false, reason: expect.stringMatching(/too old/) });
  });
});
