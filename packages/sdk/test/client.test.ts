import { describe, expect, it, vi } from "vitest";
import { decodeFunctionData, type Log } from "viem";
import { RejectReason, resourceHash, stipendHubAbi, type Challenge } from "@stipnd/protocol";
import {
  createStipndClient,
  StipndChallengeError,
  StipndHaltedError,
  StipndRejectedError,
  type Submitter,
} from "../src";
import { ACCOUNT, HUB, MERCHANT, TOKEN, credential, paidLog, rejectedLog } from "./helpers";

const url = "https://m.example/reports/1";
const challenge: Challenge = {
  scheme: "stipnd",
  version: 1,
  chainId: 421614,
  hub: HUB,
  merchant: MERCHANT,
  token: TOKEN,
  amount: "400000",
  resource: `GET ${url}`,
  resourceHash: resourceHash("GET", url),
  description: "Report 1",
  expiresAt: Math.floor(Date.now() / 1000) + 600,
};

function fakeSubmitter(outcomes: Array<"paid" | RejectReason>): Submitter & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    account: ACCOUNT,
    calls,
    async submit(call) {
      calls.push(call);
      const next = outcomes.shift() ?? "paid";
      const decoded = decodeFunctionData({ abi: stipendHubAbi, data: call.data });
      const [id, merchant, amount, res] = decoded.args as [
        bigint,
        `0x${string}`,
        bigint,
        `0x${string}`,
        string,
      ];
      const log: Log =
        next === "paid"
          ? paidLog({ id, merchant, amount, resourceHash: res })
          : rejectedLog({ id, merchant, amount, resourceHash: res, reason: next });
      return { txHash: log.transactionHash!, success: true, logs: [log] };
    },
  };
}

describe("createStipndClient.pay", () => {
  it("encodes pay() for the credential's stipend and returns a proof", async () => {
    const submitter = fakeSubmitter(["paid"]);
    const onReceipt = vi.fn();
    const client = createStipndClient({ credential, submitter, onReceipt, preflight: false });
    const { receipt, proof } = await client.pay(challenge);
    expect(receipt.status).toBe("paid");
    expect(proof.stipendId).toBe("7");
    expect(proof.txHash).toBe(receipt.txHash);
    expect(onReceipt).toHaveBeenCalledTimes(1);
    const decoded = decodeFunctionData({
      abi: stipendHubAbi,
      data: (submitter.calls[0] as { data: `0x${string}` }).data,
    });
    expect(decoded.functionName).toBe("pay");
    expect(decoded.args?.[0]).toBe(7n);
    expect(decoded.args?.[2]).toBe(400_000n);
  });

  it("throws a typed rejection and halts after repeated rejections", async () => {
    const submitter = fakeSubmitter([
      RejectReason.DuplicateResource,
      RejectReason.DuplicateResource,
      RejectReason.DuplicateResource,
    ]);
    const client = createStipndClient({
      credential,
      submitter,
      haltAfterRejections: 3,
      preflight: false,
    });
    for (let i = 0; i < 3; i++) {
      await expect(client.pay(challenge)).rejects.toBeInstanceOf(StipndRejectedError);
    }
    expect(client.consecutiveRejections).toBe(3);
    await expect(client.pay(challenge)).rejects.toBeInstanceOf(StipndHaltedError);
    expect(submitter.calls).toHaveLength(3); // the halted call never reached the chain
    client.reset();
    expect(client.consecutiveRejections).toBe(0);
  });

  it("refuses challenges for another chain, hub, or token before touching the chain", async () => {
    const submitter = fakeSubmitter([]);
    const client = createStipndClient({ credential, submitter, preflight: false });
    await expect(client.pay({ ...challenge, chainId: 1 })).rejects.toBeInstanceOf(
      StipndChallengeError,
    );
    await expect(client.pay({ ...challenge, hub: MERCHANT })).rejects.toBeInstanceOf(
      StipndChallengeError,
    );
    await expect(client.pay({ ...challenge, token: MERCHANT })).rejects.toBeInstanceOf(
      StipndChallengeError,
    );
    await expect(client.pay({ ...challenge, expiresAt: 1 })).rejects.toBeInstanceOf(
      StipndChallengeError,
    );
    expect(submitter.calls).toHaveLength(0);
  });
});

describe("createStipndClient.fetch", () => {
  it("pays a 402 challenge and retries with an Authorization proof", async () => {
    const submitter = fakeSubmitter(["paid"]);
    const seen: Array<string | null> = [];
    const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get("authorization");
      seen.push(auth);
      if (!auth) {
        return new Response(JSON.stringify(challenge), {
          status: 402,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("the report", { status: 200 });
    });
    const client = createStipndClient({
      credential,
      submitter,
      fetch: fetchImpl as typeof fetch,
      preflight: false,
    });
    const res = await client.fetch(url);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("the report");
    expect(seen[0]).toBeNull();
    expect(seen[1]).toMatch(/^Payment stipnd /);
  });

  it("passes through non-Stipnd 402s untouched", async () => {
    const submitter = fakeSubmitter([]);
    const fetchImpl = vi.fn(async () => new Response("pay me somehow", { status: 402 }));
    const client = createStipndClient({
      credential,
      submitter,
      fetch: fetchImpl as typeof fetch,
      preflight: false,
    });
    const res = await client.fetch(url);
    expect(res.status).toBe(402);
    expect(submitter.calls).toHaveLength(0);
  });
});
