import { describe, expect, it } from "vitest";
import { MerchantMode, type Policy } from "@stipnd/protocol";
import { policySentences } from "../lib/policy-text";

const base: Policy = {
  periodBudget: 60_000_000n,
  periodLength: 2_592_000,
  perCallCap: 500_000n,
  maxCallsPerWindow: 120,
  rateWindow: 3600,
  maxSameResource: 3,
  duplicateWindow: 3600,
  minMerchantSettlements: 0,
  merchantMode: MerchantMode.Any,
  expiresAt: 0,
};

describe("policySentences", () => {
  it("describes the default policy in plain words", () => {
    const s = policySentences(base);
    expect(s[0]).toBe("Up to 60.00 USDC every 1 month.");
    expect(s[1]).toBe("No single payment above 0.50 USDC.");
    expect(s[2]).toBe("At most 120 payments per 1 hour.");
    expect(s[3]).toBe("The same resource at most 3 times per 1 hour.");
    expect(s[4]).toBe("Any merchant.");
    expect(s).toHaveLength(5);
  });

  it("explains one-time budgets, verified mode with a track record, and expiry", () => {
    const s = policySentences({
      ...base,
      periodLength: 0,
      maxCallsPerWindow: 0,
      maxSameResource: 0,
      merchantMode: MerchantMode.Verified,
      minMerchantSettlements: 25,
      expiresAt: 1_900_000_000,
    });
    expect(s[0]).toBe("Up to 60.00 USDC in total, no refill.");
    expect(s).toContain("Only verified merchants with at least 25 settled payments.");
    expect(s.at(-1)).toMatch(/^Expires /);
  });
});
