import { describe, expect, it } from "vitest";
import { keccak256, stringToBytes } from "viem";
import {
  canonicalResource,
  resourceHash,
  parseChallenge,
  paymentHeaderValue,
  parsePaymentHeader,
  encodeCredential,
  decodeCredential,
  formatAmount,
  parseAmount,
  formatDuration,
  maskCredential,
} from "../src";

const addr = "0x000000000000000000000000000000000000dEaD" as const;

describe("resource hashing", () => {
  it("canonicalizes method, origin, path and query; drops fragments", () => {
    expect(canonicalResource("get", "https://api.example.com/reports/42?x=1#frag")).toBe(
      "GET https://api.example.com/reports/42?x=1",
    );
  });
  it("hashes deterministically", () => {
    const h = resourceHash("GET", "https://api.example.com/reports/42");
    expect(h).toBe(keccak256(stringToBytes("GET https://api.example.com/reports/42")));
  });
});

describe("challenge", () => {
  const challenge = {
    scheme: "stipnd",
    version: 1,
    chainId: 421614,
    hub: addr,
    merchant: addr,
    token: addr,
    amount: "400000",
    resource: "GET https://api.example.com/reports/42",
    resourceHash: resourceHash("GET", "https://api.example.com/reports/42"),
    description: "Report 42",
    expiresAt: 1_900_000_000,
  };
  it("parses a valid challenge", () => {
    expect(parseChallenge(challenge)?.amount).toBe("400000");
  });
  it("rejects a malformed amount", () => {
    expect(parseChallenge({ ...challenge, amount: "1.5" })).toBeNull();
  });
  it("round-trips a payment proof through the Authorization header", () => {
    const proof = {
      scheme: "stipnd" as const,
      chainId: 421614,
      txHash: `0x${"ab".repeat(32)}` as const,
      logIndex: 3,
      stipendId: "7",
    };
    const header = paymentHeaderValue(proof);
    expect(header.startsWith("Payment stipnd ")).toBe(true);
    expect(parsePaymentHeader(header)).toEqual(proof);
    expect(parsePaymentHeader("Bearer nope")).toBeNull();
  });
});

describe("credential", () => {
  const cred = {
    v: 1 as const,
    chainId: 421614,
    hub: addr,
    stipendId: "12",
    token: addr,
    tokenDecimals: 6,
    tokenSymbol: "USDC",
    account: addr,
    bundlerUrl: "https://rpc.zerodev.app/api/v3/abc/chain/421614",
    approval: "serialized-approval",
    label: "Research bot",
    issuedAt: 1_700_000_000,
  };
  it("encodes with a recognizable prefix and decodes losslessly", () => {
    const s = encodeCredential(cred);
    expect(s.startsWith("stipnd_v1_")).toBe(true);
    expect(decodeCredential(s)).toEqual(cred);
  });
  it("rejects foreign strings", () => {
    expect(() => decodeCredential("sk_live_whatever")).toThrow(/Not a Stipnd credential/);
  });
  it("masks for display", () => {
    expect(maskCredential(encodeCredential(cred))).toMatch(/^stipnd_v1_.{6}….{6}$/);
  });
});

describe("format", () => {
  it("formats money with two decimals and thousands separators", () => {
    expect(formatAmount(1_234_500_000n, 6)).toBe("1,234.50");
    expect(formatAmount(400_000n, 6)).toBe("0.40");
    expect(formatAmount(60_000_000n, 6)).toBe("60.00");
  });
  it("parses human input", () => {
    expect(parseAmount("0.50", 6)).toBe(500_000n);
    expect(parseAmount("1,000", 6)).toBe(1_000_000_000n);
    expect(() => parseAmount("abc", 6)).toThrow();
  });
  it("formats durations", () => {
    expect(formatDuration(3600)).toBe("1 hour");
    expect(formatDuration(86400 * 30)).toBe("1 month");
    expect(formatDuration(0)).toBe("never");
  });
});
