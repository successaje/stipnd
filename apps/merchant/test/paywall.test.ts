import { describe, expect, it } from "vitest";
import { type PublicClient, type Hex } from "viem";
import { parseChallenge, paymentHeaderValue, resourceHash } from "@stipnd/protocol";
import { createApp } from "../src/app";
import type { MerchantConfig } from "../src/config";

const HUB = "0x1000000000000000000000000000000000000001" as const;
const MERCHANT = "0x2000000000000000000000000000000000000002" as const;
const TOKEN = "0x3000000000000000000000000000000000000003" as const;

const config: MerchantConfig = {
  port: 0,
  publicUrl: "https://merchant.example",
  chainId: 421614,
  rpcUrl: "http://unused",
  hub: HUB,
  merchant: MERCHANT,
  token: TOKEN,
  tokenDecimals: 6,
  tokenSymbol: "USDC",
  challengeTtl: 600,
  proofMaxAge: 900,
};

/** A public client that returns a canned receipt for one tx hash. */
function fakeClient(receiptLogs: unknown[], txHash: Hex): PublicClient {
  return {
    async waitForTransactionReceipt({ hash }: { hash: Hex }) {
      if (hash !== txHash) throw new Error("not found");
      return { status: "success", blockNumber: 10n, logs: receiptLogs };
    },
    async getBlock() {
      return { timestamp: BigInt(Math.floor(Date.now() / 1000) - 5) };
    },
  } as unknown as PublicClient;
}

describe("stipnd paywall", () => {
  it("answers 402 with a well-formed challenge for the public URL", async () => {
    const app = createApp({ config, client: fakeClient([], `0x${"0".repeat(64)}`) });
    const res = await app.request("http://localhost:4020/reports/42");
    expect(res.status).toBe(402);
    expect(res.headers.get("www-authenticate")).toMatch(/^Payment scheme="stipnd"/);
    const challenge = parseChallenge(await res.json());
    expect(challenge).not.toBeNull();
    expect(challenge!.amount).toBe("400000");
    expect(challenge!.resource).toBe("GET https://merchant.example/reports/42");
    expect(challenge!.resourceHash).toBe(
      resourceHash("GET", "https://merchant.example/reports/42"),
    );
    expect(challenge!.description).toBe("Report 42");
  });

  it("rejects a proof whose transaction does not exist", async () => {
    const app = createApp({ config, client: fakeClient([], `0x${"1".repeat(64)}`) });
    const header = paymentHeaderValue({
      scheme: "stipnd",
      chainId: 421614,
      txHash: `0x${"2".repeat(64)}`,
      logIndex: 0,
      stipendId: "7",
    });
    const res = await app.request("http://localhost:4020/reports/42", {
      headers: { authorization: header },
    });
    expect(res.status).toBe(402);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/not found/);
  });

  it("lists the catalog with prices", async () => {
    const app = createApp({ config, client: fakeClient([], `0x${"0".repeat(64)}`) });
    const res = await app.request("http://localhost:4020/");
    const body = (await res.json()) as { catalog: Array<{ priceLabel: string }> };
    expect(body.catalog.map((i) => i.priceLabel)).toContain("0.40 USDC");
  });
});
